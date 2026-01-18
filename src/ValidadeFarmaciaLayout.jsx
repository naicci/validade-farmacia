import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Barcode,
  Calendar,
  CheckCircle2,
  Moon,
  ScanLine,
  Sun,
  X,
} from "lucide-react";

/* =========================
   BarcodeDetector helpers
========================= */
const isBarcodeDetectorSupported = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

const createBarcodeDetector = () =>
  new window.BarcodeDetector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
  });

export default function ValidadeFarmaciaLayout() {
  /* =========================
     Estados
  ========================= */
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [local, setLocal] = useState("");
  const [filterDays, setFilterDays] = useState("todos");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const barcodeRef = useRef(null);
  const nameRef = useRef(null);
  const dateRef = useRef(null);

  /* =========================
     Persistência
  ========================= */
  useEffect(() => {
    const stored = localStorage.getItem("produtos-validade");
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("produtos-validade", JSON.stringify(products));
  }, [products]);

  /* =========================
     Scanner
  ========================= */
  useEffect(() => {
    if (!scannerOpen) return;

    let active = true;
    let stream;

    const start = async () => {
      try {
        if (!isBarcodeDetectorSupported()) {
          setScannerError("Scanner não suportado.");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = createBarcodeDetector();

        const scan = async () => {
          if (!active) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              barcodeRef.current.value = codes[0].rawValue;
              setScannerOpen(false);
            }
          } catch {}
          requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setScannerError("Erro ao acessar câmera.");
      }
    };

    start();

    return () => {
      active = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [scannerOpen]);

  /* =========================
     Ações
  ========================= */
  const saveProduct = () => {
    const nome = nameRef.current.value.trim();
    const codigo = barcodeRef.current.value.trim();
    const rawDate = dateRef.current.value.trim();

    if (!nome || !rawDate) return;

    // valida dd/mm/aaaa
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) return;

    const [d, m, y] = rawDate.split("/");
    const validade = new Date(`${y}-${m}-${d}`);

    if (isNaN(validade.getTime())) return;

    setProducts((prev) => [
      { id: Date.now(), nome, validade, codigo, local },
      ...prev,
    ]);

    barcodeRef.current.value = "";
    nameRef.current.value = "";
    dateRef.current.value = "";
    setLocal("");
  };

  const removeProduct = (id) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  /* =========================
     Cálculos
  ========================= */
  const now = new Date();
  const diffDays = (d) =>
    Math.ceil((new Date(d) - now) / (1000 * 60 * 60 * 24));

  const count7 = products.filter((p) => diffDays(p.validade) <= 7).length;
  const count30 = products.filter(
    (p) => diffDays(p.validade) > 7 && diffDays(p.validade) <= 30
  ).length;
  const count90 = products.filter(
    (p) => diffDays(p.validade) > 30 && diffDays(p.validade) <= 90
  ).length;
  const countOk = products.filter((p) => diffDays(p.validade) > 90).length;

  /* =========================
     Estilos base
  ========================= */
  const container = darkMode
    ? "bg-gray-900 text-gray-100"
    : "bg-gray-100 text-gray-900";

  const card = darkMode
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const input = darkMode
    ? "bg-gray-700 text-gray-100"
    : "bg-white text-gray-900";

  /* =========================
     JSX
  ========================= */
  return (
    <div className={`min-h-screen p-4 ${container}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Controle de Validades</h1>
        <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun /> : <Moon />}
        </Button>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="grid grid-cols-2 h-11 mb-4">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="controle">Controle</TabsTrigger>
        </TabsList>

        {/* CADASTRO */}
        <TabsContent value="cadastro" className="space-y-4">
          <Card className={card}>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input ref={barcodeRef} placeholder="Código" className={input} />
                <Button
                  onClick={() => setScannerOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-4 flex gap-2"
                >
                  <ScanLine size={18} />
                  Ler código
                </Button>
              </div>

              <Input ref={nameRef} placeholder="Nome" className={input} />

              {/* VALIDADE COM TECLADO NUMÉRICO */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  Validade (dd/mm/aaaa)
                </label>
                <Input
                  ref={dateRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  className={input}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 8) v = v.slice(0, 8);
                    if (v.length >= 5)
                      v = v.replace(
                        /^(\d{2})(\d{2})(\d{1,4}).*/,
                        "$1/$2/$3"
                      );
                    else if (v.length >= 3)
                      v = v.replace(/^(\d{2})(\d{1,2}).*/, "$1/$2");
                    e.target.value = v;
                  }}
                />
              </div>

              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger className={input}>
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="estoque">Estoque</SelectItem>
                  <SelectItem value="geladeira">Geladeira</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={saveProduct}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Salvar produto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
