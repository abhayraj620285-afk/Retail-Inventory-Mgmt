import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';
import { LoginComponent } from './pages/login.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './pages/dashboard.component';
import { CrudComponent } from './pages/crud.component';
import { StockComponent } from './pages/stock.component';
import { OrdersComponent } from './pages/orders.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardComponent },

      { path: 'products', component: CrudComponent, data: {
          title: 'Products', endpoint: '/products',
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'sku', label: 'SKU', type: 'text', required: true },
            { key: 'price', label: 'Price', type: 'number', step: '0.01', required: true },
            { key: 'reorderLevel', label: 'Reorder level', type: 'number', step: '1', required: true },
            { key: 'categoryId', label: 'Category', type: 'select', optionsFrom: 'categories', initPath: 'category.id' },
          ],
          columns: [
            { label: 'Name', path: 'name' }, { label: 'SKU', path: 'sku' }, { label: 'Price', path: 'price' },
            { label: 'Reorder level', path: 'reorderLevel' }, { label: 'Category', path: 'category.name' },
          ] } },

      { path: 'categories', component: CrudComponent, data: {
          title: 'Categories', endpoint: '/categories',
          fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
          columns: [{ label: 'Name', path: 'name' }] } },

      { path: 'warehouses', component: CrudComponent, data: {
          title: 'Warehouses', endpoint: '/warehouses',
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'location', label: 'Location', type: 'text', required: true },
            { key: 'capacity', label: 'Capacity', type: 'number', step: '1', required: true },
          ],
          columns: [{ label: 'Name', path: 'name' }, { label: 'Location', path: 'location' }, { label: 'Capacity', path: 'capacity' }] } },

      { path: 'suppliers', component: CrudComponent, data: {
          title: 'Suppliers', endpoint: '/suppliers',
          fields: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'leadTimeDays', label: 'Lead time (days)', type: 'number', step: '1', required: true },
          ],
          columns: [
            { label: 'Name', path: 'name' }, { label: 'Email', path: 'contactEmail' },
            { label: 'Phone', path: 'phone' }, { label: 'Lead time (days)', path: 'leadTimeDays' },
          ] } },

      { path: 'stock', component: StockComponent },

      { path: 'purchase-orders', component: OrdersComponent, data: {
          title: 'Purchase Orders', endpoint: '/purchase-orders', party: 'supplier', priceKey: 'unitCost',
          priceLabel: 'Unit cost', warehouseLabel: 'Receiving warehouse',
          actions: {
            PENDING: [['mark-ordered', 'Mark ordered'], ['cancel', 'Cancel']],
            ORDERED: [['mark-received', 'Mark received'], ['cancel', 'Cancel']],
          } } },

      { path: 'orders', component: OrdersComponent, data: {
          title: 'Customer Orders', endpoint: '/orders', party: 'customer', priceKey: 'unitPrice',
          priceLabel: 'Unit price', warehouseLabel: 'Fulfil from warehouse',
          actions: {
            PLACED: [['mark-shipped', 'Mark shipped'], ['cancel', 'Cancel']],
            SHIPPED: [['mark-delivered', 'Mark delivered'], ['cancel', 'Cancel']],
          } } },

      { path: 'users', component: CrudComponent, canActivate: [adminGuard], data: {
          title: 'Users', endpoint: '/users', createEndpoint: '/users/register', noEdit: true,
          fields: [
            { key: 'username', label: 'Username', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'password', label: 'Password', type: 'password', required: true },
            { key: 'role', label: 'Role', type: 'select', options: ['ADMIN', 'WAREHOUSE_MANAGER', 'SALES'], required: true },
          ],
          columns: [{ label: 'Username', path: 'username' }, { label: 'Email', path: 'email' }, { label: 'Role', path: 'role' }] } },
    ],
  },
  { path: '**', redirectTo: '' },
];
