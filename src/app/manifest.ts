import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "宝を探そう",
    short_name: "宝を探そう",
    description: "夫婦で聖書通読・研究・伝道資料・タスクを管理するアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#315b4a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
