import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { API, errMsg } from '../core/api';
import { AuthService } from '../core/auth.service';

/** Used for both Purchase Orders and Customer Orders; configured per route in app.routes.ts */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-head">
      <h2>{{ cfg.title }}</h2>
      <button class="btn btn-primary" (click)="openNew()">+ New</button>
    </div>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (ok()) { <div class="alert alert-ok">{{ ok() }}</div> }

    @if (showForm()) {
      <form class="card form-grid" (ngSubmit)="submit()">
        <h3>New {{ cfg.title }}</h3>
        @if (cfg.party === 'supplier') {
          <label>Supplier
            <select [(ngModel)]="party" name="party">
              <option [ngValue]="null">— select —</option>
              @for (s of suppliers(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
            </select>
          </label>
        } @else {
          <label>Customer name <input [(ngModel)]="customerName" name="customer" /></label>
        }
        <label>{{ cfg.warehouseLabel }}
          <select [(ngModel)]="warehouseId" name="warehouse">
            <option [ngValue]="null">— select —</option>
            @for (w of warehouses(); track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }
          </select>
        </label>

        <div class="full">
          <div class="muted" style="font-size:13px;font-weight:600;margin-bottom:6px">Items</div>
          @for (r of rows; track $index) {
            <div class="item-row">
              <label>Product
                <select [ngModel]="r.productId" (ngModelChange)="r.productId = $event; pick(r)" [ngModelOptions]="{ standalone: true }">
                  <option [ngValue]="null">— select —</option>
                  @for (p of products(); track p.id) { <option [ngValue]="p.id">{{ p.name }} ({{ p.sku }})</option> }
                </select>
              </label>
              <label>Quantity <input type="number" min="1" [(ngModel)]="r.quantity" [ngModelOptions]="{ standalone: true }" /></label>
              <label>{{ cfg.priceLabel }} <input type="number" min="0" step="0.01" [(ngModel)]="r.price" [ngModelOptions]="{ standalone: true }" /></label>
              <button class="btn btn-danger" type="button" (click)="rows.splice($index, 1)" [disabled]="rows.length === 1">✕</button>
            </div>
          }
          <button class="btn btn-sm" type="button" (click)="rows.push(newRow())">+ Add item</button>
        </div>

        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="!canSubmit()">Create</button>
          <button class="btn" type="button" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>#</th><th>{{ cfg.party === 'supplier' ? 'Supplier' : 'Customer' }}</th><th>Warehouse</th>
            <th>Items</th><th>Total</th><th>Date</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.id) {
            <tr>
              <td>{{ o.id }}</td>
              <td>{{ cfg.party === 'supplier' ? o.supplier?.name : o.customerName }}</td>
              <td>{{ o.warehouse?.name }}</td>
              <td>{{ itemsText(o) }}</td>
              <td>{{ total(o) | number: '1.2-2' }}</td>
              <td>{{ o.orderDate | date: 'mediumDate' }}</td>
              <td><span class="badge s-{{ o.status }}">{{ o.status }}</span></td>
              <td class="right">
                @for (a of actionsFor(o); track a[0]) {
                  <button class="btn btn-sm" [class.btn-danger]="a[0] === 'cancel'" (click)="act(o, a[0])">{{ a[1] }}</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="8" class="muted">Nothing here yet</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class OrdersComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  cfg: any = inject(ActivatedRoute).snapshot.data;

  orders = signal<any[]>([]);
  suppliers = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  products = signal<any[]>([]);
  showForm = signal(false);
  error = signal('');
  ok = signal('');

  party: number | null = null;
  customerName = '';
  warehouseId: number | null = null;
  rows: any[] = [];

  ngOnInit() {
    this.load();
    this.http.get<any[]>(`${API}/warehouses`).subscribe(d => this.warehouses.set(d));
    this.http.get<any[]>(`${API}/products`).subscribe(d => this.products.set(d));
    if (this.cfg.party === 'supplier') this.http.get<any[]>(`${API}/suppliers`).subscribe(d => this.suppliers.set(d));
  }

  load() {
    this.http.get<any[]>(`${API}${this.cfg.endpoint}`).subscribe({
      next: d => this.orders.set([...d].sort((a, b) => b.id - a.id)),
      error: e => this.error.set(errMsg(e)),
    });
  }

  newRow() { return { productId: null, quantity: 1, price: null }; }

  openNew() {
    this.party = null; this.customerName = ''; this.warehouseId = null;
    this.rows = [this.newRow()];
    this.error.set(''); this.ok.set('');
    this.showForm.set(true);
  }

  /** Pre-fill the selling price from the product when creating a customer order */
  pick(r: any) {
    const p = this.products().find(x => x.id === r.productId);
    if (p && this.cfg.priceKey === 'unitPrice') r.price = p.price;
  }

  canSubmit() {
    const partyOk = this.cfg.party === 'supplier' ? !!this.party : !!this.customerName.trim();
    return partyOk && !!this.warehouseId && this.rows.every(r => r.productId && r.quantity > 0 && r.price > 0);
  }

  submit() {
    const items = this.rows.map(r => ({ productId: r.productId, quantity: Number(r.quantity), [this.cfg.priceKey]: Number(r.price) }));
    const body: any = this.cfg.party === 'supplier'
      ? { supplierId: this.party, warehouseId: this.warehouseId, items }
      : { customerName: this.customerName, warehouseId: this.warehouseId, userId: this.auth.userId(), items };
    this.error.set(''); this.ok.set('');
    this.http.post(`${API}${this.cfg.endpoint}`, body).subscribe({
      next: () => { this.showForm.set(false); this.ok.set('Created.'); this.load(); },
      error: e => this.error.set(errMsg(e)),
    });
  }

  actionsFor(o: any): string[][] { return this.cfg.actions[o.status] ?? []; }

  act(o: any, action: string) {
    if (action === 'cancel' && !confirm(`Cancel order #${o.id}?`)) return;
    this.error.set(''); this.ok.set('');
    this.http.patch(`${API}${this.cfg.endpoint}/${o.id}/${action}`, null).subscribe({
      next: () => { this.ok.set(`Order #${o.id} updated.`); this.load(); },
      error: e => this.error.set(errMsg(e)),
    });
  }

  itemsText(o: any) { return (o.items ?? []).map((i: any) => `${i.product?.name} × ${i.quantity}`).join(', '); }
  total(o: any) { return (o.items ?? []).reduce((s: number, i: any) => s + i.quantity * Number(i[this.cfg.priceKey] ?? 0), 0); }
}
