export const metadata = {
  title: "NOVA فروش AI",
  description: "ساخت محتوای تبلیغاتی حرفه‌ای برای محصولات",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
