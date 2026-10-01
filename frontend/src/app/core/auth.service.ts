import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API } from './api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  token = signal<string | null>(localStorage.getItem('token'));
  username = signal(localStorage.getItem('username') ?? '');
  role = signal(localStorage.getItem('role') ?? '');
  isLoggedIn = computed(() => !!this.token());
  isAdmin = computed(() => this.role() === 'ADMIN');

  login(username: string, password: string) {
    return this.http
      .post<{ token: string; username: string; role: string }>(`${API}/auth/login`, { username, password })
      .pipe(tap(r => {
        localStorage.setItem('token', r.token);
        localStorage.setItem('username', r.username);
        localStorage.setItem('role', r.role);
        this.token.set(r.token);
        this.username.set(r.username);
        this.role.set(r.role);
      }));
  }

  logout() {
    localStorage.clear();
    this.token.set(null);
    this.username.set('');
    this.role.set('');
    this.router.navigate(['/login']);
  }

  /** Reads the userId claim from the JWT payload (used when placing customer orders). */
  userId(): number | null {
    try {
      const payload = this.token()!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).userId ?? null;
    } catch {
      return null;
    }
  }
}
