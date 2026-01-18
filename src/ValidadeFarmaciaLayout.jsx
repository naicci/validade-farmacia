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
    const validade = dateRef.current.value;
    const codigo = barcodeRef.current.value.trim();
    if (!nome || !validade) return;

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

  const lastFive = products.slice(0, 5);

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
      {/* Scanner */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl">
            <div className="flex justify-between items-center p-4 border-b">
              <span className="font-semibold">Ler código</span>
              <Button variant="ghost" onClick={() => setScannerOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="h-[60vh]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />
            </div>
            {scannerError && (
              <p className="p-2 text-sm text-red-500">{scannerError}</p>
            )}
          </div>
        </div>
      )}

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
                <Input
                  ref={barcodeRef}
                  placeholder="Código"
                  className={input}
                />
                <Button onClick={() => setScannerOpen(true)}>
                  <ScanLine />
                </Button>
              </div>
              <Input ref={nameRef} placeholder="Nome" className={input} />
              <Input ref={dateRef} type="date" className={input} />
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
              <Button className="h-11 w-full" onClick={saveProduct}>
                Salvar produto
              </Button>
            </CardContent>
          </Card>

          <Card className={card}>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold text-sm">Últimos cadastrados</h2>
              {lastFive.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center text-sm"
                >
                  <span>{p.nome}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeProduct(p.id)}
                  >
                    Retirar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROLE */}
        <TabsContent value="controle" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "Até 7 dias",
                value: count7,
                icon: AlertTriangle,
                color: "red",
              },
              {
                label: "Até 30 dias",
                value: count30,
                icon: Calendar,
                color: "orange",
              },
              {
                label: "Pré-vencidos",
                value: count90,
                icon: Calendar,
                color: "yellow",
              },
              {
                label: "OK",
                value: countOk,
                icon: CheckCircle2,
                color: "green",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card
                key={label}
                className={`border-l-4 border-${color}-500 ${card}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`text-${color}-500`} size={18} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <span className="text-xl font-bold">{value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

