import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API, errMsg } from '../core/api';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head"><h2>Stock</h2></div>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (ok()) { <div class="alert alert-ok">{{ ok() }}</div> }

    <form class="card form-grid" (ngSubmit)="submit()">
      <h3>Record stock movement</h3>
      <label>Type
        <select [(ngModel)]="mv.type" name="type">
          <option value="IN">IN (receive stock)</option>
          <option value="OUT">OUT (remove stock)</option>
          <option value="TRANSFER">TRANSFER (between warehouses)</option>
        </select>
      </label>
      <label>Product
        <select [(ngModel)]="mv.productId" name="product">
          <option [ngValue]="null">— select —</option>
          @for (p of products(); track p.id) { <option [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option> }
        </select>
      </label>
      @if (mv.type !== 'IN') {
        <label>From warehouse
          <select [(ngModel)]="mv.fromWarehouseId" name="from">
            <option [ngValue]="null">— select —</option>
            @for (w of warehouses(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }
          </select>
        </label>
      }
      @if (mv.type !== 'OUT') {
        <label>To warehouse
          <select [(ngModel)]="mv.toWarehouseId" name="to">
            <option [ngValue]="null">— select —</option>
            @for (w of warehouses(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }
          </select>
        </label>
      }
      <label>Quantity <input type="number" min="1" [(ngModel)]="mv.quantity" name="qty" /></label>
      <div class="actions"><button class="btn btn-primary" type="submit" [disabled]="!canSubmit()">Record movement</button></div>
    </form>

    <div class="card">
      <div class="page-head" style="margin-bottom:8px">
        <h3>Current stock</h3>
        <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" [ngModelOptions]="{ standalone: true }">
          <option [ngValue]="null">All warehouses</option>
          @for (w of warehouses(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }
        </select>
      </div>
      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Warehouse</th><th>Quantity</th><th>Reorder level</th></tr></thead>
        <tbody>
          @for (i of visible(); track i.id) {
            <tr [class.low]="i.quantity <= i.product?.reorderLevel">
              <td>{{ i.product?.name }}</td><td>{{ i.product?.sku }}</td><td>{{ i.warehouse?.name }}</td>
              <td><b>{{ i.quantity }}</b></td><td>{{ i.product?.reorderLevel }}</td>
            </tr>
          } @empty { <tr><td colspan="5" class="muted">No stock records yet. Record an IN movement to start.</td></tr> }
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3 style="margin-bottom:8px">Movement history</h3>
      <table>
        <thead><tr><th>When</th><th>Type</th><th>Product</th><th>From</th><th>To</th><th>Qty</th></tr></thead>
        <tbody>
          @for (m of movements(); track m.id) {
            <tr>
              <td>{{ m.timestamp | date: 'medium' }}</td>
              <td><span class="badge s-{{ m.type }}">{{ m.type }}</span></td>
              <td>{{ m.product?.name }}</td><td>{{ m.fromWarehouse?.name ?? '—' }}</td>
              <td>{{ m.toWarehouse?.name ?? '—' }}</td><td>{{ m.quantity }}</td>
            </tr>
          } @empty { <tr><td colspan="6" class="muted">No movements yet</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class StockComponent {
  private http = inject(HttpClient);
  inventory = signal<any[]>([]);
  movements = signal<any[]>([]);
  products = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  filter = signal<number | null>(null);
  visible = computed(() => {
    const f = this.filter();
    return f == null ? this.inventory() : this.inventory().filter(i => i.warehouse?.id === f);
  });
  error = signal('');
  ok = signal('');
  mv: any = this.blank();

  private blank() { return { type: 'IN', productId: null, fromWarehouseId: null, toWarehouseId: null, quantity: 1 }; }

  ngOnInit() {
    this.load();
    this.http.get<any[]>(`${API}/products`).subscribe(d => this.products.set(d));
    this.http.get<any[]>(`${API}/warehouses`).subscribe(d => this.warehouses.set(d));
  }

  load() {
    this.http.get<any[]>(`${API}/inventory`).subscribe({ next: d => this.inventory.set(d), error: e => this.error.set(errMsg(e)) });
    this.http.get<any[]>(`${API}/stock-movements`).subscribe(d => this.movements.set([...d].sort((a, b) => b.id - a.id)));
  }

  canSubmit() {
    const m = this.mv;
    return !!m.productId && m.quantity > 0
      && (m.type === 'IN' || !!m.fromWarehouseId) && (m.type === 'OUT' || !!m.toWarehouseId);
  }

  submit() {
    const m = this.mv;
    const body: any = { type: m.type, productId: m.productId, quantity: Number(m.quantity) };
    if (m.type !== 'IN') body.fromWarehouseId = m.fromWarehouseId;
    if (m.type !== 'OUT') body.toWarehouseId = m.toWarehouseId;
    this.error.set(''); this.ok.set('');
    this.http.post(`${API}/stock-movements`, body).subscribe({
      next: () => { this.ok.set('Movement recorded.'); this.mv = this.blank(); this.load(); },
      error: e => this.error.set(errMsg(e)),
    });
  }
}
