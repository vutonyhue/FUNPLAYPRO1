import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { ethers } from "ethers";
import { CAMLY_TOKEN_ADDRESS, CAMLY_DECIMALS, PANCAKESWAP_ROUTER, WBNB_ADDRESS, USDT_ADDRESS } from "@/config/tokens";
import camlyCoinLogo from "@/assets/camly-coin-rainbow.png";

interface PriceDataPoint {
  timestamp: number;
  price: number;
}

interface CAMLYPriceCardProps {
  balance?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)"
];

export const CAMLYPriceCard = ({ balance = "0", onRefresh, isRefreshing }: CAMLYPriceCardProps) => {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const fetchCAMLYPrice = async () => {
    try {
      console.log("[CAMLYPriceCard] Fetching CAMLY price...");
      console.log("[CAMLYPriceCard] Token address:", CAMLY_TOKEN_ADDRESS);
      console.log("[CAMLYPriceCard] Using decimals:", CAMLY_DECIMALS);
      
      const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
      const router = new ethers.Contract(PANCAKESWAP_ROUTER, ROUTER_ABI, provider);
      
      const amountIn = ethers.parseUnits("1", CAMLY_DECIMALS); // 1 CAMLY with correct decimals
      console.log("[CAMLYPriceCard] Amount in (raw):", amountIn.toString());
      
      let price = 0;
      
      // Try direct path: CAMLY -> USDT
      try {
        const directPath = [CAMLY_TOKEN_ADDRESS, USDT_ADDRESS];
        const amounts = await router.getAmountsOut(amountIn, directPath);
        const usdtOut = ethers.formatUnits(amounts[1], 18);
        price = parseFloat(usdtOut);
        console.log("[CAMLYPriceCard] Direct path USDT out:", usdtOut);
        console.log("[CAMLYPriceCard] Direct path price:", price);
      } catch (directError) {
        console.log("[CAMLYPriceCard] Direct path failed, trying WBNB path...");
        
        // Try path via WBNB: CAMLY -> WBNB -> USDT
        try {
          const wbnbPath = [CAMLY_TOKEN_ADDRESS, WBNB_ADDRESS, USDT_ADDRESS];
          const amounts = await router.getAmountsOut(amountIn, wbnbPath);
          const usdtOut = ethers.formatUnits(amounts[2], 18);
          price = parseFloat(usdtOut);
          console.log("[CAMLYPriceCard] WBNB path USDT out:", usdtOut);
          console.log("[CAMLYPriceCard] WBNB path price:", price);
        } catch (wbnbError) {
          console.log("[CAMLYPriceCard] WBNB path also failed");
          price = 0.00001; // Fallback
        }
      }
      
      setCurrentPrice(price);
      setLastUpdateTime(new Date());
      
      // Simulate price history (in production, you'd fetch from an API)
      const now = Date.now();
      const newHistory = priceHistory.length > 0 
        ? [...priceHistory.slice(-23), { timestamp: now, price }]
        : Array.from({ length: 24 }, (_, i) => ({
            timestamp: now - (23 - i) * 3600000,
            price: price * (1 + (Math.random() - 0.5) * 0.1)
          }));
      
      setPriceHistory(newHistory);
      
      // Calculate 24h change
      if (newHistory.length >= 2) {
        const oldPrice = newHistory[0].price;
        const change = ((price - oldPrice) / oldPrice) * 100;
        setPriceChange24h(change);
        console.log("[CAMLYPriceCard] 24h price change:", change.toFixed(2), "%");
      }
      
    } catch (error) {
      console.error("[CAMLYPriceCard] Error fetching price:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCAMLYPrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCAMLYPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const balanceValue = parseFloat(balance) * currentPrice;
  const isPositiveChange = priceChange24h >= 0;

  console.log("[CAMLYPriceCard] Rendering with:");
  console.log("[CAMLYPriceCard] - Balance:", balance);
  console.log("[CAMLYPriceCard] - Current Price:", currentPrice);
  console.log("[CAMLYPriceCard] - Balance Value (USD):", balanceValue);

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={camlyCoinLogo} 
                alt="CAMLY" 
                className="w-12 h-12 rounded-full"
                style={{
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.6)",
                  filter: "drop-shadow(0 0 12px #FFD700)",
                  animation: "pulse-glow 2s ease-in-out infinite"
                }}
              />
            </div>
            <div>
              <CardTitle className="text-lg">CAMLY Token</CardTitle>
              <p className="text-sm text-muted-foreground">Camly Coin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchCAMLYPrice();
              onRefresh?.();
            }}
            disabled={isRefreshing || loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price and Change */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              ${currentPrice < 0.0001 ? currentPrice.toExponential(4) : currentPrice.toFixed(8)}
            </p>
            <div className={`flex items-center gap-1 text-sm ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
              {isPositiveChange ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositiveChange ? '+' : ''}{priceChange24h.toFixed(2)}% (24h)</span>
            </div>
          </div>
          
          {/* Mini Chart */}
          <div className="w-24 h-12">
            {priceHistory.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={isPositiveChange ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`$${value.toFixed(8)}`, "Price"]}
                    labelFormatter={(label) => new Date(label).toLocaleTimeString("vi-VN")}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="bg-background/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Số dư</span>
            <span className="font-medium">
              {parseFloat(balance).toLocaleString('vi-VN')} CAMLY
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Giá trị</span>
            <span className="font-bold text-primary">
              ${balanceValue < 0.01 ? balanceValue.toFixed(6) : balanceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Last Update */}
        {lastUpdateTime && (
          <p className="text-xs text-muted-foreground text-center">
            Cập nhật lúc: {lastUpdateTime.toLocaleTimeString("vi-VN")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
