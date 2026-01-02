import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Trash2, AlertTriangle, Shield } from "lucide-react";
import { AdminUser } from "@/hooks/useAdminManage";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuickDeleteTabProps {
  users: AdminUser[];
  onBan: (userId: string, reason: string) => Promise<boolean>;
  getSuspicionScore: (user: AdminUser) => number;
  loading: boolean;
}

const QuickDeleteTab = ({ users, onBan, getSuspicionScore, loading }: QuickDeleteTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.id.toLowerCase().includes(term) ||
        u.display_name?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.wallet_address?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [users, searchTerm]);

  // Suggested suspicious users
  const suspiciousUsers = useMemo(() => {
    return users
      .filter((u) => !u.banned)
      .map((u) => ({ ...u, score: getSuspicionScore(u) }))
      .filter((u) => u.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [users, getSuspicionScore]);

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-red-500">Rủi ro cao</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500">Nghi ngờ</Badge>;
    if (score >= 30) return <Badge className="bg-yellow-500 text-black">Theo dõi</Badge>;
    return <Badge variant="outline">Bình thường</Badge>;
  };

  const handleBan = async (user: AdminUser) => {
    const success = await onBan(user.id, "Lạm dụng hệ thống - Xóa nhanh");
    if (success) {
      toast.success(`Đã ban ${user.display_name || user.username}`);
    } else {
      toast.error("Lỗi khi ban user");
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Box */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tìm kiếm nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Nhập UID, Tên hoặc Wallet address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-lg"
          />

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{(user.display_name || user.username)?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.display_name || user.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.id}</div>
                  </div>
                  {getRiskBadge(getSuspicionScore(user))}
                  {user.banned ? (
                    <Badge variant="destructive">Đã ban</Badge>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={loading}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận ban user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            User: {user.display_name || user.username}
                            <br />
                            Pending: {(user.pending_rewards || 0).toLocaleString()} CAMLY
                            <br />
                            Hành động này không thể hoàn tác!
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleBan(user)}>
                            Xác nhận Ban
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Suspicious Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Tài khoản nghi ngờ (Gợi ý)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suspiciousUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{(user.display_name || user.username)?.[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.display_name || user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    Pending: {(user.pending_rewards || 0).toLocaleString()} CAMLY
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">{user.score}%</div>
                  <div className="text-xs text-muted-foreground">Rủi ro</div>
                </div>

                {getRiskBadge(user.score)}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={loading}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Ban
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận ban user?</AlertDialogTitle>
                      <AlertDialogDescription>
                        User: {user.display_name || user.username}
                        <br />
                        Suspicion Score: {user.score}%
                        <br />
                        Pending: {(user.pending_rewards || 0).toLocaleString()} CAMLY
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleBan(user)}>
                        Xác nhận Ban
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}

            {suspiciousUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <Shield className="w-12 h-12 text-green-500" />
                <p>Không phát hiện tài khoản nghi ngờ!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickDeleteTab;
