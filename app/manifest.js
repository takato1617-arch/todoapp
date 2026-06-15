// タスクバー/ホーム画面にインストールしたときの見た目（名前・色・アイコン）
export default function manifest() {
  return {
    name: "Todo",
    short_name: "Todo",
    description: "クラウド保存のシンプルなTodoアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#ecfdf5",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
