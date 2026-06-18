import { Headphones, Search, Tablet } from "lucide-react";
import { NotFoundHomeButton } from "@/components/not-found/not-found-home-button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="max-w-md w-full">
        <div className="bg-bg-card rounded-3xl shadow-card p-8 text-center">
          <p className="text-7xl font-bold text-line-green/20 leading-none mb-2 select-none">
            404
          </p>

          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-line-green/10 animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-line-green-light flex items-center justify-center">
              <Search className="w-12 h-12 text-line-green" strokeWidth={1.75} />
            </div>
            <div
              className="absolute -left-3 top-2 w-10 h-10 rounded-xl bg-bg-card shadow-card flex items-center justify-center -rotate-12"
              aria-hidden
            >
              <Headphones className="w-5 h-5 text-text-secondary" />
            </div>
            <div
              className="absolute -right-2 bottom-1 w-10 h-10 rounded-xl bg-bg-card shadow-card flex items-center justify-center rotate-12"
              aria-hidden
            >
              <Tablet className="w-5 h-5 text-text-secondary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-4">
            หาไม่เจอจ้า!
          </h1>

          <p className="text-text-secondary leading-relaxed mb-8">
            ขนาดหน้าเว็บอยู่ดีๆ ยังปลิวหายได้... แล้วหูฟัง/เคสไอแพดที่วางทิ้งไว้บนโต๊ะม้าหินอ่อนเมื่อกี้
            จะเหลือเร้อออ?! ไปหน้าแรกด่วน!
          </p>

          <NotFoundHomeButton />
        </div>
      </div>
    </div>
  );
}
