"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  size: string;
  stock: string;
  amount: number;
  images: string[];
};

export default function ProductDetail() {
  const params = useParams();
  const id = String(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function getProduct() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProduct(data);
      }
    }

    getProduct();
  }, [id]);

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-gray-900">Ürün bulunamadı</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600">
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const images = product.images || [];

  function previousImage() {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  }

  function nextImage() {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  }

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-4 sm:p-6">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="mb-4 inline-block text-sm font-semibold text-blue-600">
          Ana sayfaya dön
        </Link>

        <div className="rounded-2xl bg-white p-5 shadow sm:p-8">
          <p className="text-sm font-semibold text-blue-600">{product.category}</p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap gap-2 sm:gap-4">
            <span className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
              Ölçü: {product.size}
            </span>

            <span className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
              Adet: {product.amount}
            </span>

            <span className="rounded-full bg-green-100 px-3 py-2 text-sm font-semibold text-green-700">
              {product.stock}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                onClick={() => setSelectedIndex(index)}
                className="relative h-64 cursor-pointer overflow-hidden rounded-2xl bg-gray-200 sm:h-72"
              >
                <Image src={image} alt={product.name} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Kapat
          </button>

          <button
            onClick={previousImage}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-2xl font-black text-black"
          >
            ‹
          </button>

          <div className="relative h-[80vh] w-full max-w-5xl">
            <Image
              src={images[selectedIndex]}
              alt="Büyük görsel"
              fill
              className="object-contain"
            />
          </div>

          <button
            onClick={nextImage}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 px-4 py-3 text-2xl font-black text-black"
          >
            ›
          </button>

          <div className="absolute bottom-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </main>
  );
}