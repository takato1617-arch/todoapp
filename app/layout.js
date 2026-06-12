import "./globals.css";

export const metadata = {
  title: "シンプルTodo",
  description: "追加・完了・削除だけのシンプルなTodoアプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
