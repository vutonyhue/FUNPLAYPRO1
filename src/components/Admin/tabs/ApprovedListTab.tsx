import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Search, TrendingUp, Clock, Ban } from "lucide-react";
import { AdminUser } from "@/hooks/useAdminManage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApprovedListTabProps {
  users: AdminUser[];
}

const ApprovedListTab = ({ users }: ApprovedListTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const approvedUsers = useMemo(() => {
    return users
      .filter((u) => (u.approved_reward || 0) > 0)
      .sort((a, b) => (b.approved_reward || 0) - (a.approved_reward || 0));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return approvedUsers;
    const term = searchTerm.toLowerCase();
    return approvedUsers.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term)
    );
  }, [approvedUsers, searchTerm]);

  const stats = useMemo(() => {
    const pending = users.filter((u) => (u.pending_rewards || 0) > 0);
    const banned = users.filter((u) => u.banned);
    return {
      totalApproved: approvedUsers.reduce((sum, u) => sum + (u.approved_reward || 0), 0),
      pendingCount: pending.length,
      bannedCount: banned.length,
    };
  }, [users, approvedUsers]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold text-green-500">
              {stats.totalApproved.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Tổng đã duyệt</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <div className="text-xs text-muted-foreground">Đang chờ duyệt</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30">
          <CardContent className="p-4 text-center">
            <Ban className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <div className="text-2xl font-bold">{stats.bannedCount}</div>
            <div className="text-xs text-muted-foreground">Đã ban</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Danh sách đã duyệt ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Đã Duyệt</TableHead>
                  <TableHead className="text-right">Chờ</TableHead>
                  <TableHead className="text-center">Videos</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.slice(0, 50).map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {(user.display_name || user.username)?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[150px]">
                            {user.display_name || user.username}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-500">
                        {(user.approved_reward || 0).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(user.pending_rewards || 0) > 0 ? (
                        <Badge variant="outline" className="text-amber-500">
                          {(user.pending_rewards || 0).toLocaleString()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{user.videos_count || 0}</TableCell>
                    <TableCell className="text-center">{user.comments_count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Không có user đã duyệt
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovedListTab;
