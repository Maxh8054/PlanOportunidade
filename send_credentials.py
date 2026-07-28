"""
Script para enviar emails individuais com credenciais de acesso.
Cada usuario recebe um email personalizado com seu login e senha.

Configuracao necessaria:
- Preencher SMTP_SERVER, SMTP_PORT, SENDER_EMAIL, SENDER_PASSWORD
- Para Gmail: ativar "App Passwords" em https://myaccount.google.com/apppasswords
- Para Outlook: usar senha de app em https://account.live.com/proofs/manage
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl
import getpass

# ========================================
# CONFIGURACAO SMTP - PREENCHA AQUI
# ========================================
SMTP_SERVER = "smtp.gmail.com"       # Ex: smtp.gmail.com, smtp.office365.com
SMTP_PORT = 587                       # 587 (TLS) ou 465 (SSL)
SENDER_EMAIL = ""                     # Email remetente (ex: max@zaminebrasil.com)
SENDER_PASSWORD = ""                   # Senha do email ou App Password

# ========================================
# URL DA APLICACAO
# ========================================
APP_URL = "https://planilha-oportunidade.onrender.com"

# ========================================
# DADOS DOS USUARIOS
# ========================================
USERS = [
    {"name": "Marlon Mendes Silva", "email": "marlon-m@zaminebrasil.com", "password": "za01", "role": "Administrador"},
    {"name": "Max Henrique Araujo Rufino", "email": "max-r@zaminebrasil.com", "password": "za02", "role": "Administrador"},
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
    """Gera o HTML do email personalizado para cada usuario."""
    return f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f4f4f7;
                margin: 0;
                padding: 20px;
                color: #333;
            }}
            .container {{
                max-width: 560px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }}
            .header {{
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 24px;
                font-weight: 600;
            }}
            .header p {{
                color: #bbf7d0;
                margin: 8px 0 0 0;
                font-size: 14px;
            }}
            .content {{
                padding: 30px;
            }}
            .content .greeting {{
                font-size: 18px;
                color: #1a1a1a;
                margin-bottom: 6px;
            }}
            .content .message {{
                font-size: 15px;
                color: #555;
                line-height: 1.6;
                margin-bottom: 24px;
            }}
            .credentials-box {{
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-left: 4px solid #16a34a;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .credentials-box .label {{
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #16a34a;
                font-weight: 600;
                margin-bottom: 12px;
            }}
            .cred-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #dcfce7;
            }}
            .cred-row:last-child {{
                border-bottom: none;
            }}
            .cred-row .cred-label {{
                font-size: 14px;
                color: #555;
                font-weight: 500;
            }}
            .cred-row .cred-value {{
                font-size: 15px;
                color: #1a1a1a;
                font-weight: 700;
                font-family: 'Courier New', monospace;
                background: #ffffff;
                padding: 4px 12px;
                border-radius: 4px;
                border: 1px solid #dcfce7;
            }}
            .role-badge {{
                display: inline-block;
                font-size: 12px;
                padding: 3px 10px;
                border-radius: 20px;
                font-weight: 600;
                color: #ffffff;
                background-color: #16a34a;
            }}
            .role-badge.admin {{
                background-color: #dc2626;
            }}
            .role-badge.visitante {{
                background-color: #6b7280;
            }}
            .login-button {{
                display: block;
                width: 100%;
                text-align: center;
                background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                margin: 24px 0 16px 0;
                transition: opacity 0.2s;
            }}
            .login-button:hover {{
                opacity: 0.9;
            }}
            .security-note {{
                background: #fefce8;
                border: 1px solid #fde68a;
                border-left: 4px solid #eab308;
                border-radius: 8px;
                padding: 14px 18px;
                margin-top: 20px;
                font-size: 13px;
                color: #713f12;
                line-height: 1.5;
            }}
            .security-note strong {{
                color: #92400e;
            }}
            .footer {{
                background: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                font-size: 13px;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
            }}
            .footer a {{
                color: #16a34a;
                text-decoration: none;
            }}
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
                        <span class="role-badge {'admin' if user['role'] == 'Administrador' else 'visitante' if user['role'] == 'Visitante' else ''}">{user['role']}</span>
                    </div>
                </div>

                <a href="{APP_URL}" class="login-button" target="_blank">
                    Acessar Plataforma
                </a>

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
    """Gera a versao em texto puro do email."""
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


def send_email(user: dict, dry_run: bool = False) -> bool:
    """Envia um email para o usuario. Retorna True se sucesso."""
    subject = f"Seus dados de acesso - Zamine Brasil"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Zamine Brasil <{SENDER_EMAIL}>"
    msg["To"] = user["email"]

    text_part = MIMEText(create_email_text(user), "plain", "utf-8")
    html_part = MIMEText(create_email_html(user), "html", "utf-8")

    msg.attach(text_part)
    msg.attach(html_part)

    if dry_run:
        print(f"  [DRY RUN] Email seria enviado para: {user['email']}")
        print(f"             Assunto: {subject}")
        return True

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, user["email"], msg.as_string())
        return True
    except Exception as e:
        print(f"  [ERRO] Falha ao enviar para {user['email']}: {e}")
        return False


def main():
    # Verificar configuracao
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("=" * 50)
        print("  CONFIGURACAO SMTP NECESSARIA")
        print("=" * 50)
        print()
        print("Edite o script e preencha:")
        print(f"  SENDER_EMAIL  = (seu email de envio)")
        print(f"  SENDER_PASSWORD = (senha ou App Password)")
        print()
        print("Exemplos de SMTP:")
        print("  Gmail:   smtp.gmail.com:587")
        print("  Outlook: smtp.office365.com:587")
        print("  Yahoo:   smtp.mail.yahoo.com:587")
        print()

        # Permitir digitar aqui mesmo
        SENDER_EMAIL_INPUT = input("Email remetente: ").strip()
        if not SENDER_EMAIL_INPUT:
            print("Cancelado.")
            return

        SENDER_PASS_INPUT = getpass.getpass("Senha/App Password: ").strip()
        if not SENDER_PASS_INPUT:
            print("Cancelado.")
            return

        global SENDER_EMAIL, SENDER_PASSWORD
        SENDER_EMAIL = SENDER_EMAIL_INPUT
        SENDER_PASSWORD = SENDER_PASS_INPUT
        print()

    print("=" * 50)
    print("  ENVIO DE CREDENCIAIS - ZAMINE BRASIL")
    print("=" * 50)
    print(f"  SMTP: {SMTP_SERVER}:{SMTP_PORT}")
    print(f"  Remetente: {SENDER_EMAIL}")
    print(f"  Total de usuarios: {len(USERS)}")
    print(f"  URL da app: {APP_URL}")
    print("=" * 50)
    print()

    # Listar usuarios
    print("Usuarios que receberao email:")
    for i, user in enumerate(USERS, 1):
        role_icon = "[ADMIN]" if user["role"] == "Administrador" else "[USER]" if user["role"] == "Usuario" else "[VISIT]"
        print(f"  {i:2d}. {role_icon} {user['name']} <{user['email']}> — senha: {user['password']}")
    print()

    confirm = input("Confirma o envio? (s/n): ").strip().lower()
    if confirm != "s":
        print("Cancelado.")
        return

    print()
    print("Enviando emails...")
    print("-" * 50)

    success = 0
    failed = 0
    for user in USERS:
        ok = send_email(user)
        if ok:
            success += 1
            print(f"  OK: {user['email']}")
        else:
            failed += 1

    print("-" * 50)
    print(f"Resultado: {success} enviados, {failed} falhas (total: {len(USERS)})")
    print("Concluido!")


if __name__ == "__main__":
    main()
