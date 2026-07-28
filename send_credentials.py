"""
Script com GUI para enviar emails individuais com credenciais de acesso.
Cada usuario recebe um email personalizado com seu login e senha.

Use: python send_credentials.py
"""

import smtplib
import ssl
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ========================================
# CONFIGURACAO SMTP
# ========================================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# ========================================
# URL DA APLICACAO
# ========================================
APP_URL = "https://planilha-oportunidade.onrender.com"

# ========================================
# DADOS DOS USUARIOS
# ========================================
USERS = [
    {"name": "Marlon Mendes Silva", "email": "marlon-m@zaminebrasil.com", "password": "za01", "role": "Administrador"},
    {"name": "Max Henrique Araujo Demetrius Rufino", "email": "max-r@zaminebrasil.com", "password": "za02", "role": "Administrador"},
    {"name": "Julio Cesar Sanches", "email": "julio-s@zaminebrasil.com", "password": "za03", "role": "Usuario"},
    {"name": "Jun Shibuya", "email": "jun-shibuya@zaminebrasil.com", "password": "za04", "role": "Usuario"},
    {"name": "Yuji Furukawa", "email": "yuji-furukawa@zaminebrasil.com", "password": "za05", "role": "Usuario"},
    {"name": "Wallysson Diego Santiago Santos", "email": "wallysson-s@zaminebrasil.com", "password": "za06", "role": "Usuario"},
    {"name": "Wagner Maciel Cunha", "email": "wagner-m@zaminebrasil.com", "password": "za07", "role": "Usuario"},
    {"name": "Fabricio Cezar de Almeida", "email": "fabricio-c@zaminebrasil.com", "password": "za08", "role": "Usuario"},
    {"name": "Alvino Alberto Junior", "email": "alvino-j@zaminebrasil.com", "password": "za09", "role": "Usuario"},
    {"name": "Fernando Quintao Pena", "email": "fernando-p@zaminebrasil.com", "password": "za10", "role": "Usuario"},
    {"name": "Ranielly Miranda De Souza", "email": "ranielly-s@zaminebrasil.com", "password": "za11", "role": "Usuario"},
    {"name": "Rodrigo Valentino Victor", "email": "rodrigo-v@zaminebrasil.com", "password": "za12", "role": "Usuario"},
    {"name": "Victor Carvalho de Almeida", "email": "victor-a@zaminebrasil.com", "password": "za13", "role": "Usuario"},
    {"name": "Visitante", "email": "visitante@zaminebrasil.com", "password": "za00", "role": "Visitante"},
]


def create_email_html(user: dict) -> str:
    role_class = "admin" if user["role"] == "Administrador" else "visitante" if user["role"] == "Visitante" else ""
    return f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 20px; color: #333; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
            .header {{ background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }}
            .header p {{ color: #bbf7d0; margin: 8px 0 0 0; font-size: 14px; }}
            .content {{ padding: 30px; }}
            .content .greeting {{ font-size: 18px; color: #1a1a1a; margin-bottom: 6px; }}
            .content .message {{ font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px; }}
            .credentials-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .credentials-box .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; font-weight: 600; margin-bottom: 12px; }}
            .cred-row {{ display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dcfce7; }}
            .cred-row:last-child {{ border-bottom: none; }}
            .cred-row .cred-label {{ font-size: 14px; color: #555; font-weight: 500; }}
            .cred-row .cred-value {{ font-size: 15px; color: #1a1a1a; font-weight: 700; font-family: 'Courier New', monospace; background: #ffffff; padding: 4px 12px; border-radius: 4px; border: 1px solid #dcfce7; }}
            .role-badge {{ display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 600; color: #ffffff; background-color: #16a34a; }}
            .role-badge.admin {{ background-color: #dc2626; }}
            .role-badge.visitante {{ background-color: #6b7280; }}
            .login-button {{ display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 24px 0 16px 0; }}
            .security-note {{ background: #fefce8; border: 1px solid #fde68a; border-left: 4px solid #eab308; border-radius: 8px; padding: 14px 18px; margin-top: 20px; font-size: 13px; color: #713f12; line-height: 1.5; }}
            .security-note strong {{ color: #92400e; }}
            .footer {{ background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
            .footer a {{ color: #16a34a; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Zamine Brasil</h1>
                <p>Planilha de Oportunidades</p>
            </div>
            <div class="content">
                <p class="greeting">Ola, {user['name']}!</p>
                <p class="message">
                    Seus dados de acesso a plataforma foram configurados.
                    Abaixo estao suas credenciais para login:
                </p>
                <div class="credentials-box">
                    <div class="label">Suas Credenciais</div>
                    <div class="cred-row">
                        <span class="cred-label">Usuario (Email)</span>
                        <span class="cred-value">{user['email']}</span>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">Senha</span>
                        <span class="cred-value">{user['password']}</span>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">Nivel</span>
                        <span class="role-badge {role_class}">{user['role']}</span>
                    </div>
                </div>
                <a href="{APP_URL}" class="login-button" target="_blank">Acessar Plataforma</a>
                <div class="security-note">
                    <strong>Seguranca:</strong> Guarde suas credenciais em local seguro.
                    Apos o primeiro login, recomendamos trocar sua senha.
                    Em caso de esquecimento, utilize a opcao "Esqueceu a senha" na tela de login.
                    Apos 5 tentativas incorretas, sua conta sera temporariamente bloqueada.
                </div>
            </div>
            <div class="footer">
                <p>Zamine Brasil &mdash; {APP_URL}</p>
                <p>Este e-mail foi enviado automaticamente. Nao responda.</p>
            </div>
        </div>
    </body>
    </html>
    """


def create_email_text(user: dict) -> str:
    return f"""Ola, {user['name']}!

Seus dados de acesso a plataforma Planilha de Oportunidades foram configurados.

==========================================
  SUAS CREDENCIAIS
==========================================
  Email:  {user['email']}
  Senha:  {user['password']}
  Nivel:  {user['role']}
==========================================

Acesse a plataforma: {APP_URL}

Seguranca:
- Guarde suas credenciais em local seguro.
- Apos 5 tentativas incorretas, sua conta sera temporariamente bloqueada.
- Em caso de esquecimento, utilize "Esqueceu a senha" na tela de login.

---
Zamine Brasil - {APP_URL}
Este e-mail foi enviado automaticamente. Nao responda.
"""


def send_email_to_user(sender_email: str, sender_password: str, user: dict) -> tuple:
    """Envia email. Retorna (email, sucesso, mensagem)."""
    subject = "Seus dados de acesso - Zamine Brasil"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Zamine Brasil <{sender_email}>"
    msg["To"] = user["email"]
    msg.attach(MIMEText(create_email_text(user), "plain", "utf-8"))
    msg.attach(MIMEText(create_email_html(user), "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, user["email"], msg.as_string())
        return (user["email"], True, "Enviado com sucesso")
    except Exception as e:
        return (user["email"], False, str(e))


# ========================================
# GUI
# ========================================

class EmailSenderApp:
    # Cores
    BG = "#f0fdf4"
    PRIMARY = "#16a34a"
    PRIMARY_DARK = "#15803d"
    WHITE = "#ffffff"
    GRAY = "#f9fafb"
    TEXT = "#1a1a1a"
    TEXT_LIGHT = "#555"
    ADMIN_COLOR = "#dc2626"
    VISITOR_COLOR = "#6b7280"
    CHECKED_BG = "#dcfce7"
    UNCHECKED_BG = "#ffffff"

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Zamine Brasil - Envio de Credenciais")
        self.root.geometry("800x700")
        self.root.configure(bg=self.BG)
        self.root.minsize(750, 600)
        self.sending = False
        self.tree_vars: dict[str, tk.BooleanVar] = {}
        self.tree_items: dict[str, str] = {}  # email -> iid
        self._build_ui()

    # ---------- Layout ----------
    def _build_ui(self):
        # Container principal: tudo entre header e footer e fixo no fundo
        main_container = tk.Frame(self.root, bg=self.BG)
        main_container.pack(fill=tk.BOTH, expand=True)

        # ---- HEADER ----
        header = tk.Frame(main_container, bg=self.PRIMARY, height=70)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        tk.Label(header, text="  Zamine Brasil", font=("Segoe UI", 20, "bold"),
                 fg=self.WHITE, bg=self.PRIMARY).pack(side=tk.LEFT, padx=20, pady=(16, 0))

        # ---- SMTP CONFIG ----
        smtp_frame = tk.LabelFrame(main_container, text="  Configuracao SMTP  ",
                                   font=("Segoe UI", 10, "bold"), fg=self.PRIMARY_DARK,
                                   bg=self.WHITE, padx=14, pady=10, bd=2, relief=tk.GROOVE)
        smtp_frame.pack(fill=tk.X, padx=16, pady=(12, 6))

        grid = tk.Frame(smtp_frame, bg=self.WHITE)
        grid.pack(fill=tk.X)
        grid.columnconfigure(1, weight=1)

        tk.Label(grid, text="Email Remetente:", font=("Segoe UI", 10), bg=self.WHITE).grid(
            row=0, column=0, sticky="w", padx=(0, 10), pady=3)
        self.sender_email_var = tk.StringVar(value="max-r@zaminebrasil.com")
        tk.Entry(grid, textvariable=self.sender_email_var, font=("Segoe UI", 10),
                 relief=tk.GROOVE, bd=1).grid(row=0, column=1, sticky="ew", pady=3)

        tk.Label(grid, text="Senha / App Password:", font=("Segoe UI", 10), bg=self.WHITE).grid(
            row=1, column=0, sticky="w", padx=(0, 10), pady=3)
        self.sender_pass_var = tk.StringVar()
        tk.Entry(grid, textvariable=self.sender_pass_var, font=("Segoe UI", 10),
                 show="*", relief=tk.GROOVE, bd=1).grid(row=1, column=1, sticky="ew", pady=3)

        tk.Label(smtp_frame, text=f"Servidor: {SMTP_SERVER}:{SMTP_PORT}   |   "
                             f"Gmail App Password: https://myaccount.google.com/apppasswords",
                 font=("Segoe UI", 8), fg="#9ca3af", bg=self.WHITE, anchor="w").pack(fill=tk.X, pady=(4, 0))

        # ---- SELECIONAR USUARIOS ----
        list_frame = tk.LabelFrame(main_container, text="  Selecionar Destinatarios (clique na linha para marcar/desmarcar)  ",
                                   font=("Segoe UI", 10, "bold"), fg=self.PRIMARY_DARK,
                                   bg=self.WHITE, padx=10, pady=8, bd=2, relief=tk.GROOVE)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=6)

        # Botoes de filtro
        btn_bar = tk.Frame(list_frame, bg=self.WHITE)
        btn_bar.pack(fill=tk.X, pady=(0, 6))

        btn_kw = {"font": ("Segoe UI", 9, "bold"), "relief": tk.GROOVE, "bd": 1,
                  "padx": 10, "pady": 3, "cursor": "hand2"}
        tk.Button(btn_bar, text="Todos", bg="#dcfce7", fg=self.PRIMARY_DARK,
                  activebackground="#bbf7d0", command=self._select_all, **btn_kw).pack(side=tk.LEFT, padx=(0, 4))
        tk.Button(btn_bar, text="Nenhum", bg="#fee2e2", fg="#991b1b",
                  activebackground="#fecaca", command=self._deselect_all, **btn_kw).pack(side=tk.LEFT, padx=(0, 4))
        tk.Button(btn_bar, text="Admins", bg="#fef2f2", fg=self.ADMIN_COLOR,
                  activebackground="#fee2e2", command=self._select_admins, **btn_kw).pack(side=tk.LEFT, padx=(0, 4))
        tk.Button(btn_bar, text="Usuarios", bg="#f0fdf4", fg=self.PRIMARY_DARK,
                  activebackground="#dcfce7", command=self._select_users, **btn_kw).pack(side=tk.LEFT, padx=(0, 4))

        self.selected_count_var = tk.StringVar(value=f"Selecionados: 0 / {len(USERS)}")
        tk.Label(btn_bar, textvariable=self.selected_count_var, font=("Segoe UI", 9, "bold"),
                 fg=self.TEXT_LIGHT, bg=self.WHITE).pack(side=tk.RIGHT)

        # Treeview
        columns = ("check", "nome", "email", "senha", "nivel", "status")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings",
                                 selectmode="none", height=10)

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", font=("Segoe UI", 10), rowheight=32,
                         background=self.WHITE, fieldbackground=self.WHITE, borderwidth=0)
        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"),
                         background=self.GRAY, foreground=self.TEXT,
                         borderwidth=1, relief=tk.FLAT, padding=6)
        style.map("Treeview", background=[("selected", "#ecfdf5")])

        self.tree.heading("check", text="[  ]")
        self.tree.heading("nome", text="Nome")
        self.tree.heading("email", text="Email")
        self.tree.heading("senha", text="Senha")
        self.tree.heading("nivel", text="Nivel")
        self.tree.heading("status", text="Status")

        self.tree.column("check", width=42, minwidth=42, anchor="center", stretch=False)
        self.tree.column("nome", width=170, minwidth=120)
        self.tree.column("email", width=190, minwidth=140)
        self.tree.column("senha", width=55, minwidth=50, anchor="center", stretch=False)
        self.tree.column("nivel", width=95, minwidth=70, anchor="center")
        self.tree.column("status", width=110, minwidth=90, anchor="center")

        scrollbar_y = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar_y.set)

        tree_and_scroll = tk.Frame(list_frame, bg=self.WHITE)
        tree_and_scroll.pack(fill=tk.BOTH, expand=True)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, in_=tree_and_scroll)
        scrollbar_y.pack(side=tk.RIGHT, fill=tk.Y, in_=tree_and_scroll)

        # Popular treeview
        for user in USERS:
            var = tk.BooleanVar(value=False)
            self.tree_vars[user["email"]] = var

            role_tag = ("admin" if user["role"] == "Administrador"
                        else "visit" if user["role"] == "Visitante" else "user")
            check_text = "  [  ]  "
            iid = self.tree.insert("", tk.END, values=(
                check_text, user["name"], user["email"], user["password"], user["role"], ""
            ), tags=(role_tag,))
            self.tree_items[user["email"]] = iid

        self.tree.tag_configure("admin", foreground=self.ADMIN_COLOR,
                                font=("Segoe UI", 10, "bold"))
        self.tree.tag_configure("user", foreground=self.TEXT)
        self.tree.tag_configure("visit", foreground=self.VISITOR_COLOR,
                                font=("Segoe UI", 10, "italic"))

        # Bind: clicar em QUALQUER lugar da linha toggla
        self.tree.bind("<Button-1>", self._on_tree_click)
        self.tree.bind("<Double-Button-1>", self._on_tree_click)

        # ---- RODAPE FIXO COM BOTAO ENVIAR ----
        footer = tk.Frame(main_container, bg=self.BG, pady=10)
        footer.pack(fill=tk.X, side=tk.BOTTOM, padx=16)

        # Linha separadora
        sep = tk.Frame(main_container, bg="#d1d5db", height=1)
        sep.pack(fill=tk.X, side=tk.BOTTOM, padx=16)

        # Linha com botoes e progresso
        btn_row = tk.Frame(footer, bg=self.BG)
        btn_row.pack(fill=tk.X)

        self.send_btn = tk.Button(btn_row, text="  ENVIAR EMAILS SELECIONADOS  ",
                                  font=("Segoe UI", 13, "bold"),
                                  bg=self.PRIMARY, fg=self.WHITE,
                                  activebackground=self.PRIMARY_DARK,
                                  activeforeground=self.WHITE,
                                  relief=tk.FLAT, bd=0,
                                  padx=24, pady=12,
                                  cursor="hand2", command=self._send_emails)
        self.send_btn.pack(side=tk.LEFT)

        self.progress = ttk.Progressbar(btn_row, mode="determinate", length=180)
        self.progress.pack(side=tk.LEFT, padx=16, fill=tk.X, expand=True)

        self.close_btn = tk.Button(btn_row, text="Fechar",
                                   font=("Segoe UI", 10), bg="#e5e7eb", fg="#6b7280",
                                   activebackground="#d1d5db", relief=tk.FLAT, bd=0,
                                   padx=14, pady=12, cursor="hand2",
                                   command=self.root.destroy)
        self.close_btn.pack(side=tk.RIGHT)

    # ---------- Toggle por clique em qualquer lugar ----------
    def _on_tree_click(self, event):
        item = self.tree.identify_row(event.y)
        if not item:
            return
        region = self.tree.identify("region", event.x, event.y)
        if region != "tree":
            return
        values = self.tree.item(item, "values")
        email = values[2]
        var = self.tree_vars.get(email)
        if var:
            var.set(not var.get())
            self._refresh_row(email)
            self._update_count()

    def _refresh_row(self, email: str):
        """Atualiza visual de uma linha (checkbox + cor de fundo)."""
        iid = self.tree_items.get(email)
        if not iid:
            return
        var = self.tree_vars.get(email)
        checked = var.get() if var else False
        values = self.tree.item(iid, "values")
        new_check = "  [X]  " if checked else "  [  ]  "
        new_values = (new_check,) + values[1:]
        self.tree.item(iid, values=new_values)

    def _update_count(self):
        count = sum(1 for v in self.tree_vars.values() if v.get())
        total = len(USERS)
        self.selected_count_var.set(f"Selecionados: {count} / {total}")
        # Atualizar visual de todas as linhas
        for email in self.tree_vars:
            self._refresh_row(email)

    def _select_all(self):
        for v in self.tree_vars.values():
            v.set(True)
        self._update_count()

    def _deselect_all(self):
        for v in self.tree_vars.values():
            v.set(False)
        self._update_count()

    def _select_admins(self):
        for user in USERS:
            self.tree_vars[user["email"]].set(user["role"] == "Administrador")
        self._update_count()

    def _select_users(self):
        for user in USERS:
            self.tree_vars[user["email"]].set(user["role"] == "Usuario")
        self._update_count()

    # ---------- Enviar emails ----------
    def _get_selected_users(self) -> list[dict]:
        return [u for u in USERS if self.tree_vars.get(u["email"], tk.BooleanVar(value=False)).get()]

    def _set_status(self, email: str, text: str, is_ok: bool = None):
        iid = self.tree_items.get(email)
        if not iid:
            return
        values = self.tree.item(iid, "values")
        new_values = values[:5] + (text,)
        self.tree.item(iid, values=new_values)
        if is_ok is True:
            self.tree.item(iid, tags=("sent",))
            self.tree.tag_configure("sent", foreground="#16a34a", font=("Segoe UI", 10, "bold"))
        elif is_ok is False:
            self.tree.item(iid, tags=("error",))
            self.tree.tag_configure("error", foreground="#dc2626", font=("Segoe UI", 10))

    def _send_emails(self):
        if self.sending:
            return

        sender_email = self.sender_email_var.get().strip()
        sender_pass = self.sender_pass_var.get().strip()

        if not sender_email or not sender_pass:
            messagebox.showwarning("Atencao",
                                   "Preencha o email remetente e a senha/App Password nos campos acima.")
            return

        selected = self._get_selected_users()
        if not selected:
            messagebox.showwarning("Atencao",
                                   "Selecione ao menos um destinatario clicando nas linhas da tabela.")
            return

        if not messagebox.askyesno("Confirmar Envio",
                                    f"Enviar emails para {len(selected)} destinatario(s)?"):
            return

        self.sending = True
        self.send_btn.configure(state=tk.DISABLED, bg="#9ca3af", text="  ENVIANDO...  ")
        self.progress["maximum"] = len(selected)
        self.progress["value"] = 0

        # Reset status
        for u in selected:
            self._set_status(u["email"], "Enviando...", None)
        self.tree.tag_configure("sending", foreground="#a16207", font=("Segoe UI", 10, "italic"))
        for u in selected:
            iid = self.tree_items.get(u["email"])
            if iid:
                self.tree.item(iid, tags=("sending",))

        def _run():
            success = 0
            failed = 0
            for i, user in enumerate(selected):
                email_addr, ok, msg = send_email_to_user(sender_email, sender_pass, user)
                self.root.after(0, lambda ea=email_addr, o=ok, m=msg, idx=i: (
                    self._set_status(ea, "Enviado!" if o else f"Erro: {m[:30]}", o),
                    self.progress.configure(value=idx + 1)
                ))
                if ok:
                    success += 1
                else:
                    failed += 1
            total = success + failed
            self.root.after(0, lambda s=success, f=failed, t=total: self._finish_sending(s, f, t))

        threading.Thread(target=_run, daemon=True).start()

    def _finish_sending(self, success, failed, total):
        self.sending = False
        self.send_btn.configure(state=tk.NORMAL, bg=self.PRIMARY,
                                text="  ENVIAR EMAILS SELECIONADOS  ")
        self.progress["value"] = total
        messagebox.showinfo("Concluido",
                            f"Envio finalizado!\n\n"
                            f"Enviados com sucesso: {success}\n"
                            f"Falhas: {failed}\n"
                            f"Total: {total}")


def main():
    root = tk.Tk()
    app = EmailSenderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
