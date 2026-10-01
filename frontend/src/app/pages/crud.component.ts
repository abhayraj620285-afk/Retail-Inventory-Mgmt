import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { API, errMsg } from '../core/api';
import { AuthService } from '../core/auth.service';

interface Field {
  key: string; label: string; type: 'text' | 'number' | 'email' | 'password' | 'select';
  required?: boolean; step?: string; options?: string[]; optionsFrom?: string; initPath?: string;
}
interface CrudConfig {
  title: string; endpoint: string; createEndpoint?: string; noEdit?: boolean;
  fields: Field[]; columns: { label: string; path: string }[];
}

/** One generic list + add/edit/delete page, configured per route in app.routes.ts */
@Component({
  selector: 'app-crud',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <h2>{{ cfg.title }}</h2>
      <button class="btn btn-primary" (click)="openNew()">+ Add</button>
    </div>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (ok()) { <div class="alert alert-ok">{{ ok() }}</div> }

    @if (showForm()) {
      <form class="card form-grid" #frm="ngForm" (ngSubmit)="save()">
        <h3>{{ editId === null ? 'New' : 'Edit' }} record</h3>
        @for (f of cfg.fields; track f.key) {
          <label>{{ f.label }}
            @if (f.type === 'select') {
              <select [name]="f.key" [(ngModel)]="form[f.key]" [required]="!!f.required">
                <option [ngValue]="null">— select —</option>
                @for (o of optionsFor(f); track o.value) { <option [ngValue]="o.value">{{ o.label }}</option> }
              </select>
            } @else {
              <input [name]="f.key" [type]="f.type" [step]="f.step ?? 'any'" [(ngModel)]="form[f.key]" [required]="!!f.required" />
            }
          </label>
        }
        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="frm.invalid">Save</button>
          <button class="btn" type="button" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="card">
      <table>
        <thead>
          <tr>
            @for (c of cfg.columns; track c.label) { <th>{{ c.label }}</th> }
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (it of items(); track it.id) {
            <tr>
              @for (c of cfg.columns; track c.label) { <td>{{ get(it, c.path) }}</td> }
              <td class="right">
                @if (!cfg.noEdit) { <button class="btn btn-sm" (click)="edit(it)">Edit</button> }
                @if (auth.isAdmin()) { <button class="btn btn-sm btn-danger" (click)="remove(it)">Delete</button> }
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="cfg.columns.length + 1" class="muted">No records yet</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CrudComponent {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  cfg = inject(ActivatedRoute).snapshot.data as CrudConfig;

  items = signal<any[]>([]);
  lookups = signal<Record<string, any[]>>({});
  showForm = signal(false);
  error = signal('');
  ok = signal('');
  form: Record<string, any> = {};
  editId: number | null = null;

  ngOnInit() {
    this.load();
    for (const f of this.cfg.fields) {
      if (f.optionsFrom) {
        this.http.get<any[]>(`${API}/${f.optionsFrom}`).subscribe(d =>
          this.lookups.update(l => ({ ...l, [f.optionsFrom!]: d })));
      }
    }
  }

  load() {
    this.http.get<any[]>(`${API}${this.cfg.endpoint}`).subscribe({
      next: d => this.items.set(d),
      error: e => this.error.set(errMsg(e)),
    });
  }

  get(obj: any, path: string) {
    return path.split('.').reduce((o, k) => o?.[k], obj) ?? '';
  }

  optionsFor(f: Field): { value: any; label: string }[] {
    if (f.options) return f.options.map(o => ({ value: o, label: o }));
    return (this.lookups()[f.optionsFrom ?? ''] ?? []).map(o => ({ value: o.id, label: o.name }));
  }

  openNew() {
    this.editId = null;
    this.form = {};
    this.cfg.fields.forEach(f => (this.form[f.key] = f.type === 'select' ? null : ''));
    this.clearMsgs();
    this.showForm.set(true);
  }

  edit(item: any) {
    this.editId = item.id;
    this.form = {};
    this.cfg.fields.forEach(f => {
      const v = this.get(item, f.initPath ?? f.key);
      this.form[f.key] = f.type === 'select' && v === '' ? null : v;
    });
    this.clearMsgs();
    this.showForm.set(true);
  }

  save() {
    const body: any = {};
    for (const f of this.cfg.fields) {
      let v = this.form[f.key];
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
      body[f.key] = v;
    }
    const req = this.editId === null
      ? this.http.post(`${API}${this.cfg.createEndpoint ?? this.cfg.endpoint}`, body)
      : this.http.put(`${API}${this.cfg.endpoint}/${this.editId}`, body);
    this.clearMsgs();
    req.subscribe({
      next: () => { this.showForm.set(false); this.ok.set('Saved.'); this.load(); },
      error: e => this.error.set(errMsg(e)),
    });
  }

  remove(item: any) {
    if (!confirm('Delete this record?')) return;
    this.clearMsgs();
    this.http.delete(`${API}${this.cfg.endpoint}/${item.id}`).subscribe({
      next: () => { this.ok.set('Deleted.'); this.load(); },
      error: e => this.error.set(errMsg(e)),
    });
  }

  private clearMsgs() { this.error.set(''); this.ok.set(''); }
}
