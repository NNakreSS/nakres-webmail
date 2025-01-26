import { ImapSimpleOptions, Message, connect } from "imap-simple";
import { simpleParser } from "mailparser";

const config: ImapSimpleOptions = {
  imap: {
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASS!,
    host: process.env.IMAP_HOST!,
    port: parseInt(process.env.IMAP_PORT!),
    tls: true, // Güvenli bağlantı
    authTimeout: 10000, // 10 saniye
    connTimeout: 10000, // Bağlantı timeout
    keepalive: true, // Bağlantıyı canlı tut
    tlsOptions: {
      rejectUnauthorized: false, // Sertifika doğrulamasını gevşet
    },
  },
};

// Bağlantı havuzu için basit bir önbellek
let connectionPool: any = null;

async function getConnection() {
  if (connectionPool) {
    try {
      // Mevcut bağlantıyı test et
      await connectionPool.getBoxes();
      return connectionPool;
    } catch (error) {
      // Bağlantı kopmuşsa yeni bağlantı kur
      connectionPool = null;
    }
  }

  console.log("new connection");

  connectionPool = await connect(config);
  return connectionPool;
}

export async function getMails(folder = "INBOX", limit = 10, page = 1) {
  try {
    const connection = await getConnection();
    await connection.openBox(folder);

    const start = (page - 1) * limit + 1;
    const end = page * limit;

    const messageIds = await connection.search(["ALL"], {
      sort: ["ARRIVAL", "DESC"],
    });

    return console.log(messageIds.slice(start - 1, end));

    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""], // Tam mesaj içeriği için boş string eklendi
      struct: true,
    };

    const messages: Message[] = await connection.search(["ALL"], fetchOptions);

    const mails = await Promise.all(
      messages.slice(start - 1, end).map(async (message) => {
        const fullMessage = message.parts.find((part) => part.which === "");
        const parsedMail = await simpleParser(fullMessage?.body || "");

        return {
          messageId: parsedMail.messageId,
          subject: parsedMail.subject || "Konu Yok",
          from: Array.isArray(parsedMail.from)
            ? parsedMail.from[0]?.text || "Gönderen Bilinmiyor"
            : parsedMail.from?.text || "Gönderen Bilinmiyor",
          to: Array.isArray(parsedMail.to)
            ? parsedMail.to[0]?.text || "Alıcı Bilinmiyor"
            : parsedMail.to?.text || "Alıcı Bilinmiyor",
          cc: Array.isArray(parsedMail.cc)
            ? parsedMail.cc[0]?.text || ""
            : parsedMail.cc?.text || "",
          date: parsedMail.date?.toISOString() || new Date().toISOString(),
          text: parsedMail.text || "",
          html: parsedMail.html || "",
          attachments: parsedMail.attachments.map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
          })),
          flags: message.attributes?.flags || [],
          isRead: message.attributes?.flags?.includes("\\Seen") || false,
          isStarred: message.attributes?.flags?.includes("\\Flagged") || false,
          headers: {
            importance: parsedMail.headers.get("importance"),
            references: parsedMail.references,
            inReplyTo: parsedMail.inReplyTo,
          },
        };
      })
    );

    return mails;
  } catch (error) {
    console.error("IMAP bağlantı hatası:", error);
    connectionPool = null;
    throw new Error("Mailler alınamadı.");
  }
}

// Uygulama kapatılırken bağlantıyı temizle
process.on("SIGTERM", () => {
  if (connectionPool) {
    connectionPool.end();
    connectionPool = null;
  }
});
