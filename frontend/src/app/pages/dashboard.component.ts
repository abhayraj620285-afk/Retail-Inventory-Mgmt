import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API, errMsg } from '../core/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="page-head"><h2>Dashboard</h2></div>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (data(); as d) {
      <div class="stats">
        <div class="stat"><b>{{ d.products.length }}</b><span>Products</span></div>
        <div class="stat"><b>{{ d.warehouses.length }}</b><span>Warehouses</span></div>
        <div class="stat"><b>{{ d.suppliers.length }}</b><span>Suppliers</span></div>
        <div class="stat"><b>{{ openPO() }}</b><span>Open purchase orders</span></div>
        <div class="stat"><b>{{ openOrders() }}</b><span>Open customer orders</span></div>
        <div class="stat"><b>{{ lowStock().length }}</b><span>Low-stock products</span></div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:10px">Low stock (at or below reorder level)</h3>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Total in stock</th><th>Reorder level</th></tr></thead>
          <tbody>
            @for (p of lowStock(); track p.id) {
              <tr class="low"><td>{{ p.name }}</td><td>{{ p.sku }}</td><td>{{ p.total }}</td><td>{{ p.reorderLevel }}</td></tr>
            } @empty {
              <tr><td colspan="4" class="muted">All products are above their reorder level 🎉</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class DashboardComponent {
  private http = inject(HttpClient);
  data = signal<any>(null);
  error = signal('');

  openPO = computed(() => (this.data()?.purchaseOrders ?? []).filter((o: any) => ['PENDING', 'ORDERED'].includes(o.status)).length);
  openOrders = computed(() => (this.data()?.orders ?? []).filter((o: any) => ['PLACED', 'SHIPPED'].includes(o.status)).length);
  lowStock = computed(() => {
    const d = this.data();
    if (!d) return [];
    return d.products
      .map((p: any) => ({
        ...p,
        total: d.inventory.filter((i: any) => i.product?.id === p.id).reduce((s: number, i: any) => s + i.quantity, 0),
      }))
      .filter((p: any) => p.total <= p.reorderLevel);
  });

  ngOnInit() {
    const g = (path: string) => this.http.get<any[]>(`${API}${path}`);
    forkJoin({
      products: g('/products'), inventory: g('/inventory'), warehouses: g('/warehouses'),
      suppliers: g('/suppliers'), purchaseOrders: g('/purchase-orders'), orders: g('/orders'),
    }).subscribe({ next: d => this.data.set(d), error: e => this.error.set(errMsg(e)) });
  }
}
