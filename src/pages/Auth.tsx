import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Removed automatic login check - user must manually log in
  // useEffect(() => {
  //   // Check if user is already logged in
  //   supabaseApi.getCurrentUser()
  //     .then(() => {
  //       navigate("/dashboard");
  //     })
  //     .catch(() => {
  //       // Not logged in, stay on auth page
  //     });
  // }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await api.login(email, password);
        toast({
          title: "Успешно влизане",
          description: "Добре дошли!",
        });
        navigate("/dashboard");
      } else {
        await api.register(email, password, fullName || email);
        toast({
          title: "Успешна регистрация",
          description: "Акаунтът е създаден успешно!",
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Грешка",
        description: message || "Възникна грешка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast({ title: "Грешка", description: "Въведете имейл за възстановяване", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) {
      toast({ title: "Грешка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Изпратено", description: "Проверете имейла си за линк за нова парола" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HRCO Logo" className="h-20 w-20 object-contain" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Пълно име</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Иванов"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Парола</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Зареждане..." : isLogin ? "Влез" : "Регистрирай се"}
            </Button>
            {isLogin && (
              <button
                type="button"
                onClick={handleReset}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline"
              >
                Забравена парола?
              </button>
            )}
          </form>
          <div className="mt-4 space-y-2">
            <div className="text-center">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Изчисти всички данни
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
