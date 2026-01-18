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
export default function ValidadeFarmaciaLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [products, setProducts] = useState([]);
  const [local, setLocal] = useState("");
  const [filterDays, setFilterDays] = useState("todos");
  const [filterLocal, setFilterLocal] = useState("todos");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const videoRef = useRef(null);
  const readerRef = useRef(null);

  const barcodeRef = useRef(null);
  const nameRef = useRef(null);
  const dateRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("produtos-validade");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setProducts(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("produtos-validade", JSON.stringify(products));
  }, [products]);

  
  useEffect(() => {
    if (!scannerOpen) return;

    let active = true;
    setScannerError("");

    const start = async () => {
      try {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        // Request camera (environment)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        videoEl.srcObject = stream;
        await videoEl.play();

        if (!isBarcodeDetectorSupported()) {
          setScannerError("Scanner não suportado neste navegador.");
          return;
        }

        const detector = createBarcodeDetector();

        const scanLoop = async () => {
          if (!active) return;
          try {
            const barcodes = await detector.detect(videoEl);
            if (barcodes && barcodes.length) {
              const value = barcodes[0].rawValue;
              if (barcodeRef.current) barcodeRef.current.value = value;
              audioRef.current?.play();
              if (navigator.vibrate) navigator.vibrate(40);

              // stop stream
              stream.getTracks().forEach(t => t.stop());
              setScannerOpen(false);
              return;
            }
          } catch (err) {
            // ignore single-frame errors
          }
          requestAnimationFrame(scanLoop);
        };

        scanLoop();
      } catch (err) {
        console.error(err);
        setScannerError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    };

    start();

    return (
    <div className={`min-h-screen w-full px-4 py-6 md:p-6 ${containerClass}`}>
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-md rounded-xl ${
              darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
            } shadow-2xl border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
              <div className="flex items-center gap-2 font-semibold">
                <ScanLine className="w-5 h-5" />
                Ler código de barras
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScannerOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4">
              <div className="relative overflow-hidden rounded-lg border border-gray-700/40 h-[60vh]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover bg-black"
                  muted
                  playsInline
                  autoPlay
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-40 w-64 rounded-lg border-2 border-emerald-400/80" />
                </div>
              </div>

              {scannerError && (
                <div className="mt-3 text-sm text-red-400">{scannerError}</div>
              )}

              <div className={`mt-4 text-xs ${mutedText}`}>
                Aponte a câmera para o código de barras.
              </div>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
        preload="auto"
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Controle de Validades</h1>
        <Button variant="outline" size="icon" onClick={() => setDarkMode(v => !v)}>
          {darkMode ? <Sun /> : <Moon />}
        </Button>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList className="grid grid-cols-2 h-12 mb-4">
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="controle">Controle</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          {/* Cadastro rápido */}
          <Card className={cardClass}>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2 items-center">
                <Barcode />
                <Input ref={barcodeRef} placeholder="Código de barras" className={inputClass} />
                <Button onClick={() => setScannerOpen(true)} className="h-12 px-4">
                  <ScanLine />
                </Button>
              </div>

              <Input ref={nameRef} placeholder="Nome do produto" className={inputClass} />
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

              <Button onClick={saveProduct} className="w-full h-12">
                Salvar produto
              </Button>
            </CardContent>
          </Card>

          {/* Últimos 5 */}
          <Card className={cardClass}>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-semibold">Últimos cadastrados</h2>
              {lastFiveProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center">
                  <span>{p.nome}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmRemoveId(p.id)}
                  >
                    Retirar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controle" className="space-y-4">
          {/* Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className={`border-l-4 border-red-500 ${cardClass}`}>
              <CardContent className="p-3">Vencem em 7: {count7}</CardContent>
            </Card>
            <Card className={`border-l-4 border-orange-500 ${cardClass}`}>
              <CardContent className="p-3">Vencem em 30: {count30}</CardContent>
            </Card>
            <Card className={`border-l-4 border-yellow-500 ${cardClass}`}>
              <CardContent className="p-3">Pré-vencidos: {count90}</CardContent>
            </Card>
            <Card className={`border-l-4 border-green-500 ${cardClass}`}>
              <CardContent className="p-3">OK: {countOk}</CardContent>
            </Card>
          </div>

          {/* Lista completa */}
          <Card className={cardClass}>
            <CardContent className="p-4 space-y-2">
              {filteredProducts.map(p => (
                <div key={p.id} className="flex justify-between">
                  <span>{p.nome}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmRemoveId(p.id)}
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
