import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ParkingSquare } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ParkingSquare className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Página não encontrada</p>
        <Link href="/">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
