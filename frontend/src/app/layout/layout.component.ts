import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside>
        <div class="brand">📦 Inventory</div>
        <nav>
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: l.path === '/' }">{{ l.label }}</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/users" routerLinkActive="active">Users</a>
          }
        </nav>
      </aside>
      <div class="main">
        <header>
          <span class="muted">Signed in as</span> <b>{{ auth.username() }}</b>
          <span class="badge">{{ auth.role() }}</span>
          <button class="btn btn-sm" (click)="auth.logout()">Logout</button>
        </header>
        <section><router-outlet /></section>
      </div>
    </div>
  `,
  styles: [`
    .shell{display:flex;min-height:100vh}
    aside{width:220px;background:#fff;border-right:1px solid var(--border);padding:20px 12px;flex-shrink:0}
    .brand{font-size:18px;font-weight:700;color:var(--primary);padding:0 10px 18px}
    nav{display:flex;flex-direction:column;gap:2px}
    nav a{padding:9px 12px;border-radius:8px;color:#374151;text-decoration:none;font-size:14px}
    nav a:hover{background:#f3f4f6}
    nav a.active{background:#eff6ff;color:var(--primary);font-weight:600}
    .main{flex:1;min-width:0}
    header{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 24px;background:#fff;border-bottom:1px solid var(--border)}
    section{padding:24px}
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  links = [
    { path: '/', label: 'Dashboard' },
    { path: '/products', label: 'Products' },
    { path: '/categories', label: 'Categories' },
    { path: '/warehouses', label: 'Warehouses' },
    { path: '/suppliers', label: 'Suppliers' },
    { path: '/stock', label: 'Stock' },
    { path: '/purchase-orders', label: 'Purchase Orders' },
    { path: '/orders', label: 'Customer Orders' },
  ];
}
