import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errMsg } from '../core/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <form class="box" (ngSubmit)="submit()">
        <h2>📦 Inventory Manager</h2>
        <p class="muted">Sign in to continue</p>
        @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
        <label>Username <input name="username" [(ngModel)]="username" required /></label>
        <label>Password <input name="password" type="password" [(ngModel)]="password" required /></label>
        <button class="btn btn-primary" type="submit" [disabled]="loading() || !username || !password">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#dbeafe,#f0f9ff 60%,#ecfdf5)}
    .box{width:340px;background:#fff;padding:32px;border-radius:16px;box-shadow:0 10px 30px rgba(37,99,235,.12);display:flex;flex-direction:column;gap:14px}
    p{margin:0}
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: e => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
