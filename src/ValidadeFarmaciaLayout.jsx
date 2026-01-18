import { useEffect, useMemo, useRef, useState } from "react";
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

/* ===========================
   BarcodeDetector helpers
=========================== */
const isBarcodeDetectorSupported = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

const createBarcodeDetector = () =>
  new window.BarcodeDetector({
    formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
  });

export default function ValidadeFarmaciaLayout() {
  /* ===========================
     Estados
  =========================== */
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [local, setLocal] = useState("");
  const [filterDays, setFilterDays] = useState("todos");
  const [filterLocal, setFilterLocal] = useState("todos");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const videoRef = useRef(null);
  const barcodeRef = useRef(null);
  const nameRef = useRef(null);
  const dateRef = useRef(null);
  const audioRef = useRef(null);

  /* ===========================
     Persistência
  =========================== */
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

  /* ===========================
     Scanner nativo
  =========================== */
  useEffect(() => {
    if (!scannerOpen) return;

    let active = true;
    let stream;

    const start = async () => {
      try {
        if (!isBarcodeDetectorSupported()) {
          setScannerError("Scanner não suportado neste navegador.");
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
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length) {
              barcodeRef.current.value = barcodes[0].rawValue;
              audioRef.current?.play();
              setScannerOpen(false);
            }
          } catch {}
          requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setScannerError("Não foi possível acessar a câmera.");
      }
    };

    start();

    return () => {
      active = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [scannerOpen]);

  /* ===========================
     Ações
  =========================== */
  const saveProduct = () => {
    const nome = nameRef.current.value.trim();
    const validade = dateRef.current.value;
    const codigo = barcodeRef.current.value.trim();

    if (!nome || !validade) return;

    setProducts((prev) => [
      {
        id: Date.now(),
        nome,
        validade,
        codigo,
        local,
      },
      ...prev,
    ]);

    barcodeRef.current.value = "";
    nameRef.current.value = "";
    dateRef.current.value = "";
    setLocal("");
  };

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  /* ===========================
     Cálculos
  =========================== */
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

  const filteredProducts = products.filter((p) => {
    const d = diffDays(p.validade);
    const daysOk =
      filterDays === "todos"
        ? true
        : filterDays === "7"
        ? d <= 7
        : filterDays === "30"
        ? d > 7 && d <= 30
        : d > 30 && d <= 90;

    const localOk =
      filterLocal === "todos" ? true : p.local === filterLocal;

    return d >= 0 && daysOk && localOk;
  });

  const lastFive = products.slice(0, 5);

  /* ===========================
     Layout helpers
  =========================== */
  const cardClass = darkMode
    ? "bg-gray-800 text-gray-100"
    : "bg-white text-gray-900";

  const inputClass = darkMode
    ? "bg-gray-700 text-gray-100"
    : "bg-white text-gray-900";

  /* ===========================
     JSX
  =========================== */
  return (
    <div className={`min-h-screen p-4 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      {/* Scanner */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl">
            <div className="flex justify-between items-center p-4">
              <span className="font-semibold">Ler código de barras</span>
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

      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Controle de Validades</h1>
        <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Sun /> : <Moon />}
        </Button>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="grid grid-cols-2 mb-4 h-12">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="controle">Controle</TabsTrigger>
        </TabsList>

        {/* ================= CADASTRO ================= */}
        <TabsContent value="cadastro" className="space-y-4">
          <Card className={cardClass}>
            <CardContent className="space-y-3 p-4">
              <div className="flex gap-2">
                <Barcode />
                <Input ref={barcodeRef} placeholder="Código" className={inputClass} />
                <Button onClick={() => setScannerOpen(true)}>
                  <ScanLine />
                </Button>
              </div>
              <Input ref={nameRef} placeholder="Nome" className={inputClass} />
              <Input ref={dateRef} type="date" className={inputClass} />

              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="estoque">Estoque</SelectItem>
                  <SelectItem value="geladeira">Geladeira</SelectItem>
                </SelectContent>
              </Select>

              <Button className="h-12 w-full" onClick={saveProduct}>
                Salvar produto
              </Button>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold">Últimos cadastrados</h2>
              {lastFive.map((p) => (
                <div key={p.id} className="flex justify-between items-center">
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

        {/* ================= CONTROLE ================= */}
        <TabsContent value="controle" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className={cardClass}>
              <CardContent>Até 7 dias: {count7}</CardContent>
            </Card>
            <Card className={cardClass}>
              <CardContent>Até 30 dias: {count30}</CardContent>
            </Card>
            <Card className={cardClass}>
              <CardContent>Pré-vencidos: {count90}</CardContent>
            </Card>
            <Card className={cardClass}>
              <CardContent>OK: {countOk}</CardContent>
            </Card>
          </div>

          <Card className={cardClass}>
            <CardContent className="space-y-2">
              {filteredProducts.map((p) => (
                <div key={p.id} className="flex justify-between">
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
      </Tabs>
    </div>
  );
}
