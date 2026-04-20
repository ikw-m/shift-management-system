import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { employees } = useData();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください');
      return;
    }

    const success = login(email, password, employees);
    if (success) {
      toast.success('ログインしました');
      navigate('/');
    } else {
      toast.error('メールアドレスまたはパスワードが正しくありません');
    }
  };

  const handleResetData = () => {
    // localStorageをクリアしてページをリロード
    localStorage.clear();
    toast.success('データをリセットしました。ページを再読み込みします...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LogIn className="w-6 h-6" />
            シフト管理システム ログイン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              ログイン
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold mb-2">デモアカウント：</p>
            <div className="space-y-1 text-sm">
              <p><strong>マネージャー：</strong></p>
              <p className="ml-2">Email: tanaka@example.com</p>
              <p className="ml-2">Password: password123</p>
              <p className="mt-2"><strong>スタッフ：</strong></p>
              <p className="ml-2">Email: sato@example.com</p>
              <p className="ml-2">Password: password123</p>
            </div>
          </div>

          <div className="mt-4">
            <Button
              type="button"
              className="w-full bg-red-500 text-white"
              onClick={handleResetData}
            >
              データをリセット
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}