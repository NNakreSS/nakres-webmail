import Imap from "imap";
import { simpleParser } from "mailparser";

const config = {
  user: process.env.IMAP_USER!,
  password: process.env.IMAP_PASS!,
  host: process.env.IMAP_HOST!,
  port: parseInt(process.env.IMAP_PORT!),
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false,
  },
  keepalive: true,
  authTimeout: 10000,
};

let connectionPool: Imap | null = null;

function getConnection(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    if (connectionPool?.state === "authenticated") {
      return resolve(connectionPool);
    }

    console.log("new connection");
    const imap = new Imap(config);

    imap.once("ready", () => {
      connectionPool = imap;
      resolve(imap);
    });

    imap.once("error", (err: Error) => {
      connectionPool = null;
      reject(err);
    });

    imap.connect();
  });
}

export async function getMails(folder = "INBOX", limit = 20, page = 1) {
  try {
    const imap = await getConnection();

    const messages = await new Promise<any[]>((resolve, reject) => {
      imap.openBox(folder, false, (err, box) => {
        if (err) reject(err);

        // Tüm mailleri getir ve tarihe göre sırala
        imap.search(["ALL"], (err, results) => {
          if (err) reject(err);

          // Sondan başa doğru sırala
          results.reverse();

          // Sayfalama
          const start = (page - 1) * limit;
          const end = start + limit;
          const pageResults = results.slice(start, end);

          const fetch = imap.fetch(pageResults, {
            bodies: [""],
            struct: true,
          });

          const messages: any[] = [];

          fetch.on("message", (msg) => {
            const message: any = {};

            msg.on("body", (stream) => {
              let buffer = "";
              stream.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
              });
              stream.once("end", () => {
                message.body = buffer;
              });
            });

            msg.once("attributes", (attrs) => {
              message.attributes = attrs;
            });

            msg.once("end", () => {
              messages.push(message);
            });
          });

          fetch.once("error", (err) => {
            reject(err);
          });

          fetch.once("end", () => {
            resolve(messages);
          });
        });
      });
    });

    const mails = await Promise.all(
      messages.map(async (message) => {
        const parsedMail = await simpleParser(message.body);

        return {
          uid: message.attributes.uid,
          messageId: parsedMail.messageId,
          subject: parsedMail.subject || "Konu Yok",
          from: Array.isArray(parsedMail.from)
            ? parsedMail.from[0]?.text || "Gönderen Bilinmiyor"
            : parsedMail.from?.text || "Gönderen Bilinmiyor",
          date: parsedMail.date?.toISOString() || new Date().toISOString(),
          isRead: message.attributes.flags?.includes("\\Seen") || false,
          isStarred: message.attributes.flags?.includes("\\Flagged") || false,
        };
      })
    );

    return {
      mails,
      total: mails.length,
      page,
      totalPages: Math.ceil(mails.length / limit),
    };
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
