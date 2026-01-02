import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, Check, X, Eye, Search, Calendar } from "lucide-react";
import { AdminUser } from "@/hooks/useAdminManage";
import { toast } from "sonner";
import { format } from "date-fns";

interface RewardApprovalTabProps {
  users: AdminUser[];
  onApprove: (userId: string) => Promise<boolean>;
  onReject: (userId: string) => Promise<boolean>;
  loading: boolean;
}

const RewardApprovalTab = ({ users, onApprove, onReject, loading }: RewardApprovalTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const pendingUsers = users.filter((u) => (u.pending_rewards || 0) > 0);

  const filteredUsers = pendingUsers.filter((u) => {
    const matchSearch =
      u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.includes(searchTerm);
    return matchSearch;
  });

  const handleApprove = async (userId: string, name: string) => {
    const success = await onApprove(userId);
    if (success) {
      toast.success(`Đã duyệt thưởng cho ${name}`);
    } else {
      toast.error("Lỗi khi duyệt thưởng");
    }
  };

  const handleReject = async (userId: string, name: string) => {
    const success = await onReject(userId);
    if (success) {
      toast.success(`Đã từ chối thưởng của ${name}`);
    } else {
      toast.error("Lỗi khi từ chối thưởng");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, username hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{pendingUsers.length}</div>
            <div className="text-xs text-muted-foreground">Chờ duyệt</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {pendingUsers.reduce((sum, u) => sum + (u.pending_rewards || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Tổng CAMLY chờ</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Danh sách chờ duyệt ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{(user.display_name || user.username)?.[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.display_name || user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.videos_count || 0} videos • {user.comments_count || 0} comments
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                    {(user.pending_rewards || 0).toLocaleString()} CAMLY
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    Đã duyệt: {(user.approved_reward || 0).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => handleApprove(user.id, user.display_name || user.username)}
                    disabled={loading}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleReject(user.id, user.display_name || user.username)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Không có user nào chờ duyệt
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RewardApprovalTab;
