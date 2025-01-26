"use client";

import useSWR from "swr";

interface Mail {
  subject: string;
  from: string;
  date: string;
  text: string;
  html: string;
}

interface Data {
  mails: Mail[];
  total: number;
  page: number;
  totalPages: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MailList: React.FC = () => {
  const { data, error, isLoading } = useSWR<Data | { error: string }>(
    "/api/mail/inbox",
    fetcher
  );

  console.log(data);

  if (isLoading) return <p>Mailler yükleniyor...</p>;
  if (error || (data as { error: string }).error)
    return <p>Mailler alınırken bir hata oluştu: {error?.message}</p>;
  if (!data || (data as Data).mails.length === 0)
    return <p>Hiç mail bulunamadı.</p>;

  return (
    <div className="w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Gelen Mailler</h1>
      <div className="space-y-4">
        {(data as Data).mails.map((mail, index) => (
          <div key={index} className="border p-4 mb-2 rounded-lg shadow-md">
            <h2 className="font-bold">{mail.subject}</h2>
            <p>From: {mail.from}</p>
            <p>Date: {mail.date}</p>
            <p className="text-sm text-gray-600">{mail.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MailList;
