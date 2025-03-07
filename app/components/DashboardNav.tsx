"use client";
import React from "react";
import { CreditCard, Settings, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { navItem } from "./UserNav";



export default function DashboardNav() {
  const pathname = usePathname();
  console.log(pathname);
  return (
    <nav className="grid items-start gap-2">
      {navItem.map((item, index) => (
        <Link key={index} href={item.href}>
          <span
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent" : "bg-transparent"
            )}
          >
            <item.icon className="mr-2 h-4 w-4 text-primary" />
            <span>{item.name}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
