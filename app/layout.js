import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ProductProvider } from "@/context/ProductContext";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "Product Dashboard | DukaanSe",
  description: "A responsive product management dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <ProductProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: "14px" },
            }}
          />
        </ProductProvider>
      </body>
    </html>
  );
}
