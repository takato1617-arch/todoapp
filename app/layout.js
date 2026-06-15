import "./globals.css";

export const metadata = {
  title: "Todo",
  description: "クラウド保存のシンプルでおしゃれなTodoアプリ",
};

export const viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
