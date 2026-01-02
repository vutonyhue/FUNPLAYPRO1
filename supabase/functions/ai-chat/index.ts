import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Bạn là FUN Play AI Assistant - trợ lý thông minh của nền tảng FUN Play.

FUN Play là mạng xã hội Web3 kết hợp AI, giống YouTube hiện đại với các tính năng:
- Ví crypto tích hợp (MetaMask, Bitget Wallet)
- Token CAMLY để thưởng cho mọi hoạt động người dùng
- Honor Board (Bảng vinh danh) hiển thị thành tựu người dùng
- NFT Gallery để hiển thị và quản lý NFT
- Không thu phí nền tảng

Nhiệm vụ của bạn:
1. Hỗ trợ người dùng sử dụng FUN Play
2. Giải đáp thắc mắc về Web3, crypto, NFT
3. Hướng dẫn cách kiếm CAMLY token
4. Gợi ý nội dung sáng tạo cho video
5. Trả lời bằng tiếng Việt, thân thiện và nhiệt tình

Màu sắc thương hiệu: Xanh Ngọc Lam (#00E7FF) và Vàng Hoàng Kim (#FFD700)
Tầm nhìn: Xây dựng cộng đồng ánh sáng toàn cầu`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Đã đạt giới hạn yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Cần nạp thêm credits để sử dụng AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi kết nối AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Lỗi không xác định" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
