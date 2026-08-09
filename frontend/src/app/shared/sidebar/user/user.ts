import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { UserService, User } from '../services/user';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user.html',
  styleUrls: ['./user.css'],
})
export class UserComponent implements OnInit {

  // ======================================================
  // STATE
  // ======================================================
  users: User[] = [];
  selectedUser: User | null = null;

  searchText = '';

  showCreateModal = false;
  showPasswordBox: string | null = null;

  createForm!: FormGroup;
  passwordForm!: FormGroup;

  filters: {
    role?: string;
    is_approved?: boolean;
    deleted?: boolean;
    can_manage_users?: boolean;
  } = {};

  constructor(private userService: UserService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef) {}

  // ======================================================
  // INIT
  // ======================================================
  ngOnInit(): void {
    this.initForms();
    this.loadUsers();
  }

  // ======================================================
  // FORMS INIT
  // ======================================================
  initForms(): void {
    this.createForm = this.fb.group({
      username: [''],
      first_name: [''],
      last_name: [''],
      email: [''],
      phone: [''],
      password: [''],
      role: ['user'],
    });

    this.passwordForm = this.fb.group({
      password: [''],
    });
  }

  // ======================================================
  // LOAD USERS
  // ======================================================
  loadUsers(): void {
    this.userService.getAllUsers(this.filters).subscribe({
      next: (res) => {
        this.users = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.users = [];
        this.cdr.markForCheck();
      }
    });
  }

  // ======================================================
  // SEARCH USER
  // ======================================================
  searchUser(): void {
    if (!this.searchText.trim()) {
      this.loadUsers();
      return;
    }

    this.userService.getUserDetailsByName(this.searchText).subscribe({
      next: (res) => {
        this.users = res?.data ? [res.data] : [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.users = [];
        this.cdr.markForCheck();
      }
    });
  }

  // ======================================================
  // CREATE USER / ADMIN
  // ======================================================
  createUser(): void {
    this.userService.createUser(this.createForm.value).subscribe(() => {
      this.loadUsers();
      this.showCreateModal = false;
      this.createForm.reset({ role: 'user' });
    });
  }

  createAdmin(): void {
    this.userService.createAdmin(this.createForm.value).subscribe(() => {
      this.loadUsers();
      this.showCreateModal = false;
      this.createForm.reset({ role: 'admin' });
    });
  }

  // ======================================================
  // UPDATE FIELD
  // ======================================================
  updateField(user: User, field: string, value: any): void {
    this.userService.updateUserData({
      userIds: user.user_id,
      data: { [field]: value },
    }).subscribe(() => this.loadUsers());
  }

  // ======================================================
  // ROLE CHANGE
  // ======================================================
  changeRole(user: User, role: string): void {
    this.userService.changeUserRole(user.user_id, role)
      .subscribe(() => this.loadUsers());
  }

  // ======================================================
  // TOGGLES
  // ======================================================
  toggleDeleted(user: User): void {
    this.userService
      .toggleDeleted(user.user_id, !user.deleted)
      .subscribe(() => this.loadUsers());
  }

  toggleCanManageUsers(user: User): void {
    this.userService
      .toggleCanManageUsers(user.user_id, !user.can_manage_users)
      .subscribe(() => this.loadUsers());
  }

  toggleIsApproved(user: User): void {
    this.userService
      .toggleIsApproved(user.user_id, !user.is_approved)
      .subscribe(() => this.loadUsers());
  }

  // ======================================================
  // PASSWORD HANDLING
  // ======================================================
  openPasswordBox(user: User): void {
    this.selectedUser = user;
    this.showPasswordBox = user.user_id;
    this.passwordForm.reset();
  }

  updatePassword(user: User | null): void {
    if (!user) return;

    const password = this.passwordForm.value?.password;
    if (!password) return;

    this.userService.updatePassword(user.user_id, password)
      .subscribe(() => {
        this.showPasswordBox = null;
        this.selectedUser = null;
        this.passwordForm.reset();
      });
  }

  // ======================================================
  // DELETE ACTIONS
  // ======================================================
  softDelete(user: User): void {
    this.userService.softDeleteUsers(user.user_id)
      .subscribe(() => this.loadUsers());
  }

  hardDelete(user: User): void {
    this.userService.deleteUsers(user.user_id)
      .subscribe(() => this.loadUsers());
  }
}