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
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/browser";

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
        if (!readerRef.current) {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        readerRef.current = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 100,
        });
      }
        const videoEl = videoRef.current;
        if (!videoEl) return;

        // decodeFromConstraints removed for mobile reliability
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera =
          devices.find(d =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear")
          ) || devices[devices.length - 1];

        await readerRef.current.decodeFromVideoDevice(
          backCamera.deviceId,
          videoEl,
          (result) => {
            if (!active) return;
            if (!result) return;

            const text = result.getText?.() ?? String(result);
            if (barcodeRef.current) barcodeRef.current.value = text;
            audioRef.current?.play();
            if (navigator.vibrate) navigator.vibrate(40);
            readerRef.current.reset();
            setScannerOpen(false);
          }
        );
      } catch {
        setScannerError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    };

    start();

    return () => {
      active = false;
      try {
        readerRef.current?.reset();
      } catch {}
    };
  }, [scannerOpen]);

  const containerClass = darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900";

  const cardClass = darkMode
    ? "bg-gray-800 border border-gray-700 text-gray-100 shadow-lg"
    : "bg-white border border-gray-200 text-gray-900 shadow-lg";

  const inputClass = darkMode
    ? "bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:border-emerald-400"
    : "bg-white text-gray-900 placeholder-gray-500 border border-gray-300 focus:border-emerald-500";

  const subtleText = darkMode ? "text-gray-200" : "text-gray-700";
  const mutedText = darkMode ? "text-gray-300" : "text-gray-600";

  const selectContentClass = useMemo(() => {
    return `z-[9999] ${
      darkMode
        ? "bg-gray-800 text-gray-100 border border-gray-700"
        : "bg-white text-gray-900 border border-gray-200"
    }`;
  }, [darkMode]);

  const now = useMemo(() => new Date(), [products.length]);

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setConfirmRemoveId(null);
  };

  const saveProduct = () => {
    if (saving) return;

    const codigo = barcodeRef.current?.value?.trim() || "";
    const nome = nameRef.current?.value?.trim() || "";
    const validade = dateRef.current?.value || "";

    if (!nome || !validade) return;

    setSaving(true);
    setSaved(false);

    const newProduct = {
      id: Date.now(),
      codigo,
      nome,
      validade,
      local,
    };

    setTimeout(() => {
      setProducts((prev) => [newProduct, ...prev]);
      setSaving(false);
      setSaved(true);
      audioRef.current?.play();
      if (navigator.vibrate) navigator.vibrate(80);

      if (barcodeRef.current) barcodeRef.current.value = "";
      if (nameRef.current) nameRef.current.value = "";
      if (dateRef.current) dateRef.current.value = "";
      setLocal("");

      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const count7 = useMemo(() => {
    return products.filter((p) => {
      const diff = (new Date(p.validade) - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
  }, [products, now]);

  const count30 = useMemo(() => {
    return products.filter((p) => {
      const diff = (new Date(p.validade) - now) / (1000 * 60 * 60 * 24);
      return diff > 7 && diff <= 30;
    }).length;
  }, [products, now]);

  const count90 = useMemo(() => {
    return products.filter((p) => {
      const diff = (new Date(p.validade) - now) / (1000 * 60 * 60 * 24);
      return diff > 30 && diff <= 90;
    }).length;
  }, [products, now]);

  const countOk = useMemo(() => {
    return products.filter((p) => {
      const diff = (new Date(p.validade) - now) / (1000 * 60 * 60 * 24);
      return diff > 90;
    }).length;
  }, [products, now]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const diff = Math.ceil((new Date(p.validade) - now) / (1000 * 60 * 60 * 24));

        const daysOk =
          filterDays === "todos"
            ? true
            : filterDays === "7"
              ? diff <= 7
              : filterDays === "30"
                ? diff > 7 && diff <= 30
                : diff > 30 && diff <= 90;

        const localOk = filterLocal === "todos" ? true : (p.local || "") === filterLocal;

        return diff >= 0 && daysOk && localOk;
      })
      .sort((a, b) => new Date(a.validade) - new Date(b.validade));
  }, [products, now, filterDays, filterLocal]);

  return (
    <div className={`min-h-screen w-full px-4 py-6 md:p-6 ${containerClass}`}>
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          <div
            className={`w-full h-full ${
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
                className={darkMode ? "text-gray-100" : "text-gray-900"}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4">
              <div className="relative overflow-hidden rounded-lg border border-gray-700/40">
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

              {scannerError && <div className="mt-3 text-sm text-red-400">{scannerError}</div>}

              <div className={`mt-4 text-xs ${mutedText}`}>
                Aponte a câmera para o código de barras. Ao reconhecer, ele será preenchido automaticamente.
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

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Controle de Validades</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDarkMode((v) => !v)}
          className={
            darkMode
              ? "bg-gray-800 border border-gray-700 text-gray-100 shadow-lg hover:bg-gray-700 transition-all duration-300 hover:shadow-emerald-500/20"
              : "bg-white border border-gray-300 text-gray-800 shadow-lg hover:bg-gray-200 transition-all duration-300 hover:shadow-emerald-400/30"
          }
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4 mb-6">
        <Card className={`border-l-4 border-red-500 ${cardClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <AlertTriangle size={20} />
              Vencem em até 7 dias
            </div>
            <p className="text-2xl mt-2">{count7} produtos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 border-orange-500 ${cardClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-400 font-semibold">
              <Calendar size={20} />
              Vencem em até 30 dias
            </div>
            <p className="text-2xl mt-2">{count30} produtos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 border-yellow-500 ${cardClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold">
              <Calendar size={20} />
              Pré-vencidos (até 3 meses)
            </div>
            <p className="text-2xl mt-2">{count90} produtos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 border-green-500 ${cardClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <CheckCircle2 size={20} />
              Dentro da validade
            </div>
            <p className="text-2xl mt-2">{countOk} produtos</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`mb-6 ${cardClass}`}>
        <CardContent className="p-4">
          <h2 className={`text-lg font-semibold mb-4 ${subtleText}`}>Cadastro rápido</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-4">
            <div className="flex flex-col gap-1">
              <span className={`text-sm ${mutedText}`}>Código de barras</span>
              <div className="flex items-center gap-2">
                <Barcode />
                <Input
                  ref={barcodeRef}
                  className={inputClass}
                  placeholder="Código de barras"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onFocus={() => setScannerOpen(true)}
                />              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className={`text-sm ${mutedText}`}>Nome do produto</span>
              <Input ref={nameRef} className={inputClass} placeholder="Nome do produto" />
            </div>

            <div className="flex flex-col gap-1">
              <span className={`text-sm ${mutedText}`}>Validade</span>
              <Input ref={dateRef} className={inputClass} type="date" />
            </div>

            <div className="flex flex-col gap-1">
              <span className={`text-sm ${mutedText}`}>Local</span>
              <Select value={local} onValueChange={setLocal}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="estoque">Estoque</SelectItem>
                  <SelectItem value="geladeira">Geladeira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={saveProduct}
              disabled={saving}
              className={`w-full font-semibold shadow-lg hover:shadow-emerald-500/40 transition-all duration-300 ${
                saving ? "bg-emerald-400" : saved ? "bg-green-600" : "bg-emerald-600 hover:bg-emerald-700"
              } text-white`}
            >
              {saving ? "Salvando..." : saved ? "Produto salvo ✓" : "Salvar produto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`mb-6 ${cardClass}`}>
        <CardContent className="p-4">
          <h2 className={`text-lg font-semibold mb-4 ${subtleText}`}>Filtros</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Filtrar por vencimento" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="7">Vencem em até 7 dias</SelectItem>
                <SelectItem value="30">Vencem em até 30 dias</SelectItem>
                <SelectItem value="90">Pré-vencidos (até 3 meses)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterLocal} onValueChange={setFilterLocal}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Filtrar por local" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="todos">Todos os locais</SelectItem>
                <SelectItem value="balcao">Balcão</SelectItem>
                <SelectItem value="estoque">Estoque</SelectItem>
                <SelectItem value="geladeira">Geladeira</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className={`${inputClass} font-semibold`}
              onClick={() => {
                setFilterDays("todos");
                setFilterLocal("todos");
              }}
            >
              Limpar filtros
            </Button>
          </div>

          <p className={`mt-4 text-sm ${mutedText}`}>Mostrando {filteredProducts.length} produto(s)</p>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardContent className="p-4">
          <h2 className={`text-lg font-semibold mb-4 ${subtleText}`}>Próximos a vencer</h2>

          <div className="space-y-2">
            {filteredProducts.map((p) => {
              const diff = Math.ceil((new Date(p.validade) - now) / (1000 * 60 * 60 * 24));
              const isUrgent = diff <= 1;
              const isPreVencido = diff > 30 && diff <= 90;

              return (
                <div
                  key={p.id}
                  className={`flex flex-col md:flex-row md:justify-between md:items-center gap-2 p-3 rounded ${
                    diff <= 7
                      ? "bg-red-900/40"
                      : diff <= 30
                        ? "bg-orange-900/35"
                        : diff <= 90
                          ? "bg-yellow-900/35"
                          : "bg-green-900/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.nome}</span>

                    {isUrgent && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white">
                        URGENTE
                      </span>
                    )}

                    {!isUrgent && isPreVencido && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-500 text-gray-900">
                        PRÉ-VENCIDO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <span className={`font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
                      Vence em {diff} dias
                    </span>

                    {confirmRemoveId === p.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProduct(p.id)}
                          className="shadow-md hover:shadow-red-500/40 transition-all duration-300"
                        >
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRemoveId(null)}
                          className={inputClass}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmRemoveId((prev) => (prev === p.id ? null : p.id))}
                        className="shadow-md hover:shadow-red-500/40 transition-all duration-300"
                      >
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
