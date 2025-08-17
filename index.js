<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pannello Gestione Ristoranti</title>
    <script>
        if (localStorage.getItem('superAdminAuthToken') !== 'authenticated') {
            const currentPath = window.location.pathname;
            const newPath = currentPath.substring(0, currentPath.lastIndexOf('/')) + '/admin-login.html';
            window.location.href = newPath;
        }
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Fluid Glass Design System */
        :root {
            --glass-white: rgba(255, 255, 255, 0.1);
            --glass-white-solid: rgba(255, 255, 255, 0.95);
            --glass-border: rgba(255, 255, 255, 0.2);
            --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
            --glass-blur: blur(10px);
            --glass-blur-heavy: blur(20px);
            
            --primary-gradient: linear-gradient(135deg, #C6A969 0%, #8B7355 100%);
            --secondary-gradient: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
            --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            --danger-gradient: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            
            --text-primary: #1a1a2e;
            --text-secondary: #4a5568;
            --text-light: rgba(255, 255, 255, 0.9);
            
            --animation-smooth: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #fdfcf8 0%, #f5f3ed 50%, #fdfcf8 100%);
            background-attachment: fixed;
            min-height: 100vh;
            color: var(--text-primary);
            overflow-x: hidden;
        }
        
        /* Animated background elements */
        body::before,
        body::after {
            content: '';
            position: fixed;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.4;
            animation: float 25s ease-in-out infinite;
            pointer-events: none;
            z-index: -1;
        }
        
        body::before {
            width: 500px;
            height: 500px;
            background: linear-gradient(135deg, #C6A969 0%, #D4AF37 100%);
            top: -250px;
            right: -250px;
            opacity: 0.3;
        }
        
        body::after {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #e8e8e8 0%, #f5f5f5 100%);
            bottom: -200px;
            left: -200px;
            animation-delay: -12.5s;
            opacity: 0.3;
        }
        
        @keyframes float {
            0%, 100% {
                transform: translate(0, 0) scale(1);
            }
            25% {
                transform: translate(100px, -100px) scale(1.1);
            }
            50% {
                transform: translate(-50px, 100px) scale(0.9);
            }
            75% {
                transform: translate(-100px, -50px) scale(1.05);
            }
        }
        
        /* Glass components */
        .glass-panel {
            background: var(--glass-white);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            box-shadow: var(--glass-shadow);
            overflow: hidden;
            position: relative;
        }
        
        .glass-panel-solid {
            background: var(--glass-white-solid);
            backdrop-filter: var(--glass-blur-heavy);
            -webkit-backdrop-filter: var(--glass-blur-heavy);
        }
        
        /* Header */
        .header {
            background: var(--glass-white);
            backdrop-filter: var(--glass-blur-heavy);
            -webkit-backdrop-filter: var(--glass-blur-heavy);
            border-bottom: 1px solid var(--glass-border);
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .page-title {
            font-size: 1.75rem;
            font-weight: 700;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
        }
        
        /* Navigation */
        .nav {
            display: flex;
            gap: 0.5rem;
        }
        
        .nav-link {
            padding: 0.625rem 1.25rem;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 12px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.3s var(--animation-smooth);
            position: relative;
            overflow: hidden;
        }
        
        .nav-link::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: var(--primary-gradient);
            opacity: 0.1;
            transition: left 0.3s var(--animation-smooth);
        }
        
        .nav-link:hover {
            color: #667eea;
            border-color: rgba(102, 126, 234, 0.3);
            transform: translateY(-1px);
        }
        
        .nav-link:hover::before {
            left: 0;
        }
        
        .nav-link.active {
            background: var(--primary-gradient);
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        /* Buttons */
        .btn {
            padding: 0.625rem 1.25rem;
            border: none;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s var(--animation-smooth);
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.6s;
        }
        
        .btn:hover::before {
            left: 100%;
        }
        
        .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: var(--text-primary);
            border: 1px solid var(--glass-border);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
        
        .btn-danger {
            background: var(--danger-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(238, 9, 121, 0.3);
        }
        
        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(238, 9, 121, 0.4);
        }
        
        .btn-icon {
            width: 36px;
            height: 36px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid var(--glass-border);
            color: var(--text-secondary);
        }
        
        .btn-icon:hover {
            background: rgba(255, 255, 255, 0.2);
            color: var(--text-primary);
            transform: translateY(-1px) rotate(5deg);
        }
        
        /* Container */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        /* Cards */
        .card {
            background: var(--glass-white);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: var(--glass-shadow);
            transition: all 0.3s var(--animation-smooth);
            position: relative;
            overflow: hidden;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(31, 38, 135, 0.25);
        }
        
        .card:hover::before {
            opacity: 1;
        }
        
        /* Forms */
        .form-group {
            margin-bottom: 1.25rem;
        }
        
        .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            font-size: 0.875rem;
            color: var(--text-primary);
            transition: all 0.3s var(--animation-smooth);
            backdrop-filter: blur(5px);
        }
        
        .form-input:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(102, 126, 234, 0.5);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-input::placeholder {
            color: rgba(74, 85, 104, 0.5);
        }
        
        /* Table */
        .table-container {
            background: var(--glass-white-solid);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--glass-shadow);
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th {
            background: rgba(102, 126, 234, 0.1);
            padding: 1rem;
            text-align: left;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 1px solid var(--glass-border);
        }
        
        .table td {
            padding: 1rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            font-size: 0.875rem;
        }
        
        .table tr:hover {
            background: rgba(102, 126, 234, 0.03);
        }
        
        .table tr:last-child td {
            border-bottom: none;
        }
        
        /* Badge */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-success {
            background: rgba(17, 153, 142, 0.1);
            color: #11998e;
            border: 1px solid rgba(17, 153, 142, 0.2);
        }
        
        .badge-danger {
            background: rgba(238, 9, 121, 0.1);
            color: #ee0979;
            border: 1px solid rgba(238, 9, 121, 0.2);
        }
        
        /* Avatar */
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: var(--primary-gradient);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            overflow: hidden;
        }
        
        .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: var(--glass-white);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s var(--animation-smooth);
            position: relative;
            overflow: hidden;
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--primary-gradient);
            transform: scaleX(0);
            transition: transform 0.3s var(--animation-smooth);
        }
        
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px rgba(31, 38, 135, 0.2);
        }
        
        .stat-card:hover::before {
            transform: scaleX(1);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
        
        /* Modal */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s var(--animation-smooth);
        }
        
        .modal-backdrop.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-content {
            background: var(--glass-white-solid);
            backdrop-filter: var(--glass-blur-heavy);
            -webkit-backdrop-filter: var(--glass-blur-heavy);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s var(--animation-smooth);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal-backdrop.show .modal-content {
            transform: translateY(0) scale(1);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .modal-close {
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s var(--animation-smooth);
            color: var(--text-secondary);
        }
        
        .modal-close:hover {
            background: rgba(0, 0, 0, 0.1);
            transform: rotate(90deg);
        }
        
        /* Toast */
        .toast {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--glass-white-solid);
            backdrop-filter: var(--glass-blur-heavy);
            -webkit-backdrop-filter: var(--glass-blur-heavy);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transform: translateX(400px);
            transition: transform 0.3s var(--animation-smooth);
            z-index: 1100;
        }
        
        .toast.show {
            transform: translateX(0);
        }
        
        .toast-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .toast-success .toast-icon {
            background: rgba(17, 153, 142, 0.2);
            color: #11998e;
        }
        
        .toast-error .toast-icon {
            background: rgba(238, 9, 121, 0.2);
            color: #ee0979;
        }
        
        /* Loading */
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--glass-border);
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 2rem auto;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        
        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.3;
        }
        
        .empty-state-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }
        
        .empty-state-text {
            font-size: 0.875rem;
        }
        
        /* Animations */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate-in {
            animation: slideIn 0.5s var(--animation-smooth);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
            }
            
            .nav {
                width: 100%;
                justify-content: center;
            }
            
            .container {
                padding: 1rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .table-container {
                overflow-x: auto;
            }
            
            .toast {
                bottom: 1rem;
                right: 1rem;
                left: 1rem;
                max-width: none;
            }
        }
        
        /* Fix for action buttons */
        .actions-cell {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .action-btn {
            padding: 6px 8px;
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 32px;
        }
        
        .action-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: var(--gold-accent);
            color: var(--text-primary);
            transform: translateY(-1px);
        }
        
        .action-btn.danger {
            border-color: #dc3545;
            color: #dc3545;
        }
        
        .action-btn.danger:hover {
            background: rgba(220, 53, 69, 0.1);
            border-color: #dc3545;
        }
        
        /* Fix for tab buttons */
        .tab-btn {
            background: transparent;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        }
        
        .tab-btn.active {
            background: var(--primary-gradient) !important;
            color: white !important;
        }
        
        .tab-btn:not(.active) {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
        }
        
        .tab-btn:not(.active):hover {
            background: rgba(255, 255, 255, 0.2);
            color: var(--text-primary);
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <h1 class="page-title">Admin Panel</h1>
            <nav class="nav">
                <a href="#ristoranti" onclick="showView('ristoranti')" class="nav-link active">Ristoranti</a>
                <a href="#statistiche" onclick="showView('statistiche')" class="nav-link">Statistiche</a>
                <a href="#utilizzo" onclick="showView('utilizzo')" class="nav-link">Utilizzo</a>
            </nav>
            <button onclick="window.logout()" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
            </button>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container" style="margin-top: 100px;">
        <!-- Ristoranti Section -->
        <section id="ristoranti" class="view-section active">
            <div class="card" style="margin-bottom: 24px;">
                <div style="padding: 24px; border-bottom: 1px solid var(--glass-border);">
                    <h2 class="section-title" style="margin-bottom: 0;">Nuovo Ristorante</h2>
                </div>
                <div style="padding: 24px;">
                    <form id="add-resto-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: end;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Nome Ristorante</label>
                            <input type="text" name="nomeRistorante" class="form-input" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Username</label>
                            <input type="text" name="username" class="form-input" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Password</label>
                            <input type="password" name="password" class="form-input" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Email</label>
                            <input type="email" name="email" class="form-input" required placeholder="email@esempio.com">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Logo (opzionale)</label>
                            <input type="file" name="logo" accept="image/*" style="font-size: 14px;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="align-self: end;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Aggiungi
                        </button>
                    </form>
                </div>
            </div>

            <div class="card">
                <div style="padding: 24px; border-bottom: 1px solid var(--glass-border);">
                    <h2 class="section-title" style="margin-bottom: 0;">Ristoranti Registrati</h2>
                </div>
                <div id="restaurants-list" style="padding: 0;"></div>
            </div>
        </section>

        <!-- Statistiche Section -->
        <section id="statistiche" class="view-section hidden">
            <div class="card" style="margin-bottom: 24px;">
                <div style="padding: 24px;">
                    <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
                        <div style="display: flex; gap: 4px; background: var(--glass-white); padding: 4px; border-radius: 8px;">
                            <button type="button" class="btn btn-secondary active tab-btn" onclick="setStatsDateFilter(0)" style="padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;">Oggi</button>
                            <button type="button" class="btn btn-secondary tab-btn" onclick="setStatsDateFilter(1)" style="padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;">Ieri</button>
                            <button type="button" class="btn btn-secondary tab-btn" onclick="setStatsDateFilter(7)" style="padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;">7 giorni</button>
                            <button type="button" class="btn btn-secondary tab-btn" onclick="setStatsDateFilter(30)" style="padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;">30 giorni</button>
                            <button type="button" class="btn btn-secondary tab-btn" onclick="setStatsDateFilter(90)" style="padding: 8px 16px; font-size: 14px; border-radius: 6px; cursor: pointer;">90 giorni</button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
                            <label style="font-size: 14px; color: var(--text-secondary);">Da:</label>
                            <input type="date" id="stats-start-date" class="form-input" style="width: 160px; padding: 8px 12px; font-size: 14px;">
                            <label style="font-size: 14px; color: var(--text-secondary);">A:</label>
                            <input type="date" id="stats-end-date" class="form-input" style="width: 160px; padding: 8px 12px; font-size: 14px;">
                            <button onclick="fetchAndRenderAnalytics()" class="btn" style="padding: 8px 16px;">Applica</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid" id="analytics-content"></div>
            
            <div id="analytics-loading" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>Seleziona un intervallo di date per visualizzare le statistiche</p>
            </div>
        </section>

        <!-- Utilizzo Section -->
        <section id="utilizzo" class="view-section hidden">
            <div class="card">
                <div style="padding: 24px; border-bottom: 1px solid var(--glass-border);">
                    <h2 class="section-title" style="margin-bottom: 0;">Utilizzo Servizi Cloud</h2>
                </div>
                <div id="usage-loading" class="text-center" style="padding: 60px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid var(--glass-border); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 16px; color: var(--text-secondary);">Caricamento dati...</p>
                </div>
                <div id="usage-content" class="hidden" style="padding: 24px;"></div>
                <div id="usage-error" class="hidden" style="padding: 24px; text-align: center; color: #dc3545;"></div>
            </div>
        </section>
    </main>
    
    <!-- Edit Modal -->
    <div id="edit-modal" class="modal-backdrop hidden">
        <div class="modal-content">
            <h3 class="section-title">Modifica Ristorante</h3>
            <form id="edit-resto-form">
                <input type="hidden" name="docId">
                <div class="form-group">
                    <label class="form-label">Nome Ristorante</label>
                    <input type="text" name="nomeRistorante" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" name="username" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nuova Password</label>
                    <input type="password" name="password" class="form-input" placeholder="Lascia vuoto per non cambiare">
                </div>
                <div class="form-group">
                    <label class="form-label">Cambia Logo (opzionale)</label>
                    <input type="file" name="logo" accept="image/*" style="font-size: 14px;">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="button" onclick="closeEditModal()" class="btn btn-secondary" style="flex: 1;">Annulla</button>
                    <button type="submit" class="btn" style="flex: 1;">Salva Modifiche</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="delete-confirm-modal" class="modal-backdrop hidden">
        <div class="modal-content text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" style="margin: 0 auto 16px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3 class="section-title" style="color: #dc3545;">Conferma Eliminazione</h3>
            <p style="margin: 16px 0; color: var(--text-secondary);">
                Stai per eliminare il ristorante <strong id="delete-resto-name" style="color: var(--text-primary);"></strong>.<br>
                Questa azione è <strong style="color: #dc3545;">irreversibile</strong> e cancellerà tutti i dati associati.
            </p>
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button onclick="closeDeleteConfirmModal()" class="btn btn-secondary" style="flex: 1;">Annulla</button>
                <button id="confirm-delete-btn" class="btn btn-danger" style="flex: 1;">Elimina</button>
            </div>
        </div>
    </div>
    
    <!-- Toast Notification -->
    <div id="toast-notification" class="toast hidden">
        <div class="toast-icon">
            ✓
        </div>
        <span id="toast-message"></span>
    </div>
    
    <!-- Loading spinner CSS -->
    <style>
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .view-section { display: none; }
        .view-section.active { display: block; }
    </style>

    <script type="module">
        // --- CORREZIONE QUI ---
        const backendUrl = 'https://upload-beckend.onrender.com';

        function showToast(message, type = "success") {
            const toast = document.getElementById("toast-notification");
            const toastMessage = document.getElementById("toast-message");
            const toastIcon = toast.querySelector('.toast-icon');
            
            if (!toast || !toastMessage) return;
            
            toastMessage.textContent = message;
            toast.className = "toast show";
            
            if (type === "error") {
                toast.classList.add('toast-error');
                toastIcon.textContent = '✕';
            } else if (type === "info") {
                toast.classList.add('toast-info');
                toastIcon.textContent = 'ℹ';
            } else {
                toast.classList.add('toast-success');
                toastIcon.textContent = '✓';
            }
            
            setTimeout(() => { 
                toast.classList.remove("show");
                setTimeout(() => {
                    toast.className = "toast hidden";
                }, 300);
            }, 4000);
        }

        async function fetchRestaurants() {
            try {
                const response = await fetch(`${backendUrl}/restaurants`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Errore nel caricamento dei dati.');
                }
                const restaurants = await response.json();
                renderRestaurants(restaurants);
            } catch (error) {
                showToast(error.message, 'error');
                document.getElementById('restaurants-list').innerHTML = `<p class="text-red-400 text-center">${error.message}</p>`;
            }
        }

        function renderRestaurants(restaurants) {
            const listContainer = document.getElementById('restaurants-list');
            listContainer.innerHTML = '';
            
            if (restaurants.length === 0) {
                listContainer.innerHTML = '<div class="empty-state"><p>Nessun ristorante registrato</p></div>';
                return;
            }
            
            // Sort by name
            restaurants.sort((a, b) => a.nomeRistorante.localeCompare(b.nomeRistorante));
            
            // Create table
            const table = document.createElement('table');
            table.className = 'table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>ID</th>
                        <th>Stato</th>
                        <th class="text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            const tbody = table.querySelector('tbody');
            restaurants.forEach(resto => {
                const isHidden = resto.hidden || false;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${(resto.logoUrl && resto.logoUrl !== 'null') 
                                ? `<img src="${resto.logoUrl}" alt="Logo" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` 
                                : `<div style="width: 32px; height: 32px; border-radius: 50%; background: var(--glass-white); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 14px;">${resto.nomeRistorante.charAt(0).toUpperCase()}</div>`}
                            <span style="font-weight: 500;">${resto.nomeRistorante}</span>
                        </div>
                    </td>
                    <td><span style="font-family: monospace; font-size: 13px;">${resto.username}</span></td>
                    <td>${resto.email || '<span style="color: var(--text-secondary);">—</span>'}</td>
                    <td><span style="font-family: monospace; font-size: 13px; color: var(--text-secondary);">${resto.restaurantId || resto.id.slice(0, 8)}</span></td>
                    <td>${isHidden 
                        ? '<span class="badge" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">Disattivato</span>'
                        : '<span class="badge badge-success">Attivo</span>'}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="action-btn" onclick="viewRestaurantAnalytics('${resto.id}', '${resto.nomeRistorante.replace(/'/g, "\\'")}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12H3M21 6H3M21 18H3M10 6V18"></path>
                                </svg>
                            </button>
                            <button class="action-btn" onclick="toggleRestaurantStatus('${resto.id}', ${!isHidden})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    ${isHidden ? 
                                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' :
                                        '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                                    }
                                </svg>
                            </button>
                            <button class="action-btn" onclick="openEditModal('${resto.id}', '${resto.nomeRistorante.replace(/'/g, "\\'")}', '${resto.username}', '${resto.email || ''}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="action-btn danger" onclick="openDeleteConfirmModal('${resto.id}', '${resto.nomeRistorante.replace(/'/g, "\\'")}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            listContainer.appendChild(table);
        }

        // Form handlers
        document.getElementById('add-resto-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            button.textContent = 'Aggiunta...';
            try {
                showToast('Creazione in corso...', 'info');
                const response = await fetch(`${backendUrl}/create-restaurant`, { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Errore sconosciuto');
                showToast('Ristorante aggiunto!', 'success');
                fetchRestaurants();
                form.reset();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                button.disabled = false;
                button.textContent = 'Aggiungi';
            }
        });

        document.getElementById('edit-resto-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const docId = form.docId.value;
            const formData = new FormData(form);
            const button = form.querySelector('button[type="submit"]');
            
            // Validate required fields
            const requiredFields = ['nomeRistorante', 'username', 'email'];
            const missingFields = [];
            
            requiredFields.forEach(field => {
                const value = formData.get(field);
                if (!value || value.trim() === '') {
                    missingFields.push(field);
                }
            });
            
            if (missingFields.length > 0) {
                showToast('Compila tutti i campi obbligatori', 'error');
                return;
            }
            
            // Validate email format
            const email = formData.get('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Inserisci un indirizzo email valido', 'error');
                return;
            }
            
            button.disabled = true;
            const originalText = button.textContent;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvataggio in corso...
            `;

            try {
                console.log('Updating restaurant:', docId);
                const response = await fetch(`${backendUrl}/restaurant/${docId}`, { 
                    method: 'PUT', 
                    body: formData 
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Errore del server: ${response.status}`);
                }
                
                const result = await response.json();
                showToast(result.message || 'Ristorante aggiornato con successo!', 'success');
                fetchRestaurants(); // Refresh the list
                closeEditModal();
            } catch (error) {
                console.error('Error updating restaurant:', error);
                showToast(error.message || 'Errore durante l\'aggiornamento', 'error');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });

        // Modal functions - now properly declared as window functions
        window.openDeleteConfirmModal = (docId, restaurantName) => {
            const modal = document.getElementById('delete-confirm-modal');
            document.getElementById('delete-resto-name').textContent = restaurantName;
            
            const confirmBtn = document.getElementById('confirm-delete-btn');
            confirmBtn.onclick = () => deleteRestaurant(docId, restaurantName);
            
            modal.classList.remove('hidden');
        };

        window.closeDeleteConfirmModal = () => {
            document.getElementById('delete-confirm-modal').classList.add('hidden');
        };

        async function deleteRestaurant(docId, restaurantName) {
            closeDeleteConfirmModal();
            showToast(`Eliminazione di "${restaurantName}" in corso...`, 'info');
            try {
                const response = await fetch(`${backendUrl}/delete-restaurant/${docId}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                showToast(result.message, 'success');
                fetchRestaurants();
            } catch (error) {
                showToast(error.message, 'error');
            }
        }

        window.openEditModal = (docId, name, username, email) => {
            const modal = document.getElementById('edit-modal');
            const form = document.getElementById('edit-resto-form');
            form.docId.value = docId;
            form.nomeRistorante.value = name;
            form.username.value = username;
            form.email.value = email || '';
            form.password.value = '';
            modal.classList.remove('hidden');
        };

        window.closeEditModal = () => {
            document.getElementById('edit-modal').classList.add('hidden');
        };

        window.logout = function() {
            localStorage.removeItem('superAdminAuthToken');
            const currentPath = window.location.pathname;
            const newPath = currentPath.substring(0, currentPath.lastIndexOf('/')) + '/admin-login.html';
            window.location.href = newPath;
        };
        
        // Date filter functionality - fix active button management
        window.setStatsDateFilter = (daysBack) => {
            const endDate = new Date();
            const startDate = new Date();
            
            if (daysBack === 0) {
                // Today
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (daysBack === 1) {
                // Yesterday
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
            } else {
                // Multiple days back
                startDate.setDate(startDate.getDate() - daysBack);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }
            
            document.getElementById('stats-start-date').value = startDate.toISOString().split('T')[0];
            document.getElementById('stats-end-date').value = endDate.toISOString().split('T')[0];
            
            // Update active button - fix selector
            document.querySelectorAll('#statistiche .tab-btn').forEach(btn => btn.classList.remove('active'));
            const clickedButton = event?.target;
            if (clickedButton && clickedButton.classList.contains('tab-btn')) {
                clickedButton.classList.add('active');
            }
            
            fetchAndRenderAnalytics();
        };
        
        // Restaurant status toggle - FIXED
        window.toggleRestaurantStatus = async (restaurantId, hide) => {
            // Validate restaurantId
            if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
                showToast('Errore: ID ristorante non valido. Impossibile modificare lo stato.', 'error');
                return;
            }
            
            console.log('Toggling restaurant status:', restaurantId, 'hide:', hide);
            
            try {
                const response = await fetch(`${backendUrl}/toggle-restaurant-status/${restaurantId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hide: hide })
                });
                
                if (!response.ok) {
                    let errorMsg = 'Errore nell\'aggiornamento dello stato.';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorMsg;
                    } catch (e) {
                        errorMsg = `Errore ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMsg);
                }
                
                const result = await response.json();
                showToast(result.message || (hide ? 'Ristorante disattivato' : 'Ristorante attivato'), 'success');
                fetchRestaurants(); // Refresh the list
            } catch (error) {
                console.error('Toggle status error:', error);
                showToast(error.message, 'error');
            }
        };
        
        // View restaurant analytics - FIXED
        window.viewRestaurantAnalytics = async (restaurantId, restaurantName) => {
            // Validate restaurantId
            if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
                showToast('Errore: ID ristorante non valido. Impossibile caricare le analitiche.', 'error');
                return;
            }
            
            console.log('Opening analytics for:', restaurantId, restaurantName);
            
            // Create a modal for restaurant analytics
            const existingModal = document.getElementById('restaurant-analytics-modal');
            if (existingModal) existingModal.remove();
            
            const modal = document.createElement('div');
            modal.id = 'restaurant-analytics-modal';
            modal.className = 'modal-backdrop show';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3 class="modal-title">Analitiche - ${restaurantName}</h3>
                        <button onclick="this.closest('#restaurant-analytics-modal').remove()" class="modal-close">&times;</button>
                    </div>
                    <div class="mb-4">
                        <div style="display: flex; gap: 4px; background: var(--glass-white); padding: 4px; border-radius: 8px; margin-bottom: 1rem;">
                            <button class="tab-btn active" onclick="setRestaurantStatsFilter('${restaurantId}', 0)">Oggi</button>
                            <button class="tab-btn" onclick="setRestaurantStatsFilter('${restaurantId}', 1)">Ieri</button>
                            <button class="tab-btn" onclick="setRestaurantStatsFilter('${restaurantId}', 7)">7 giorni</button>
                            <button class="tab-btn" onclick="setRestaurantStatsFilter('${restaurantId}', 30)">30 giorni</button>
                            <button class="tab-btn" onclick="setRestaurantStatsFilter('${restaurantId}', 90)">90 giorni</button>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;">
                            <label style="font-weight: 500;">Da:</label>
                            <input type="date" id="restaurant-stats-start" class="form-input" style="max-width: 150px;">
                            <label style="font-weight: 500;">A:</label>
                            <input type="date" id="restaurant-stats-end" class="form-input" style="max-width: 150px;">
                            <button onclick="fetchRestaurantAnalytics('${restaurantId}')" class="btn btn-primary" style="padding: 8px 16px;">Applica</button>
                        </div>
                    </div>
                    <div id="restaurant-analytics-content">
                        <div class="text-center py-4">Caricamento...</div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Set default to today and load analytics
            setRestaurantStatsFilter(restaurantId, 0);
        };
        
        window.setRestaurantStatsFilter = (restaurantId, daysBack) => {
            const endDate = new Date();
            const startDate = new Date();
            
            if (daysBack === 0) {
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (daysBack === 1) {
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate.setDate(startDate.getDate() - daysBack);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }
            
            document.getElementById('restaurant-stats-start').value = startDate.toISOString().split('T')[0];
            document.getElementById('restaurant-stats-end').value = endDate.toISOString().split('T')[0];
            
            // Update active button in modal
            const modal = document.getElementById('restaurant-analytics-modal');
            if (modal) {
                modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                const buttons = modal.querySelectorAll('.tab-btn');
                const activeIndex = daysBack === 0 ? 0 : daysBack === 1 ? 1 : daysBack === 7 ? 2 : daysBack === 30 ? 3 : daysBack === 90 ? 4 : -1;
                if (activeIndex >= 0 && buttons[activeIndex]) {
                    buttons[activeIndex].classList.add('active');
                }
            }
            
            fetchRestaurantAnalytics(restaurantId);
        };
        
        window.fetchRestaurantAnalytics = async (restaurantId) => {
            const startDate = document.getElementById('restaurant-stats-start').value;
            const endDate = document.getElementById('restaurant-stats-end').value;
            const contentEl = document.getElementById('restaurant-analytics-content');
            
            if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
                contentEl.innerHTML = '<div style="text-align: center; color: #ef4444;">Errore: ID ristorante non trovato</div>';
                return;
            }
            
            if (!startDate || !endDate) {
                contentEl.innerHTML = '<div style="text-align: center; color: #6b7280;">Seleziona date valide</div>';
                return;
            }
            
            try {
                contentEl.innerHTML = '<div style="text-align: center; padding: 1rem;">Caricamento...</div>';
                
                const response = await fetch(`${backendUrl}/analytics/${restaurantId}?startDate=${startDate}&endDate=${endDate}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Errore di rete' }));
                    throw new Error(errorData.error || 'Errore nel caricamento delle analitiche.');
                }
                
                const analytics = await response.json();
                
                contentEl.innerHTML = `
                    <div class="stats-grid" style="margin-bottom: 2rem;">
                        <div class="stat-card">
                            <div class="stat-label">Incasso Totale</div>
                            <div class="stat-value">€${(analytics.totalRevenue || 0).toFixed(2)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Totale Conti Pagati</div>
                            <div class="stat-value">${analytics.totalSessions || 0}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
                        <div class="card">
                            <h3 style="font-weight: 600; margin-bottom: 1rem;">Andamento Incassi</h3>
                            <div style="position: relative; height: 320px;">
                                <canvas id="restaurant-revenue-chart"></canvas>
                            </div>
                        </div>
                        <div class="card">
                            <h3 style="font-weight: 600; margin-bottom: 1rem;">Numero Conti per Giorno</h3>
                            <div style="position: relative; height: 320px;">
                                <canvas id="restaurant-orders-chart"></canvas>
                            </div>
                        </div>
                    </div>`;
                    
                    // Render charts
                    setTimeout(() => {
                        const chartOptions = { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { display: false } 
                            }, 
                            scales: { 
                                x: { 
                                    ticks: { color: '#666666' },
                                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                                }, 
                                y: { 
                                    ticks: { color: '#666666' },
                                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                                } 
                            } 
                        };
                        
                        const revenueCanvas = document.getElementById('restaurant-revenue-chart');
                        if (revenueCanvas) {
                            new Chart(revenueCanvas, {
                                type: 'bar',
                                data: { 
                                    labels: analytics.dailyRevenue.map(d => d.date), 
                                    datasets: [{ 
                                        label: 'Incasso', 
                                        data: analytics.dailyRevenue.map(d => d.revenue), 
                                        backgroundColor: '#C6A969',
                                        borderColor: '#C6A969',
                                        borderWidth: 0
                                    }] 
                                },
                                options: chartOptions
                            });
                        }
                        
                        const ordersCanvas = document.getElementById('restaurant-orders-chart');
                        if (ordersCanvas) {
                            new Chart(ordersCanvas, {
                                type: 'line',
                                data: { 
                                    labels: analytics.dailySessions.map(d => d.date), 
                                    datasets: [{ 
                                        label: 'Conti', 
                                        data: analytics.dailySessions.map(d => d.sessions), 
                                        borderColor: '#3B82F6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        tension: 0.3,
                                        fill: true,
                                        pointBackgroundColor: '#3B82F6',
                                        pointBorderColor: '#fff',
                                        pointBorderWidth: 2,
                                        pointRadius: 4,
                                        pointHoverRadius: 6
                                    }] 
                                },
                                options: chartOptions
                            });
                        }
                    }, 100);
                
            } catch (error) {
                console.error('Error fetching restaurant analytics:', error);
                contentEl.innerHTML = `<div class="col-span-full text-center text-red-600">Errore: ${error.message}</div>`;
            }
        };

        // FIXED showView function - remove conflicts
        window.showView = (viewId) => {
            // Update sections
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(viewId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const targetNav = document.querySelector(`.nav-link[href="#${viewId}"]`);
            if (targetNav) {
                targetNav.classList.add('active');
            }
            
            // Load data if needed
            if (viewId === 'statistiche' && !document.getElementById('analytics-content').hasChildNodes()) {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 29);
                document.getElementById('stats-start-date').valueAsDate = startDate;
                document.getElementById('stats-end-date').valueAsDate = endDate;
                fetchAndRenderAnalytics();
            }
            if (viewId === 'utilizzo' && !document.getElementById('usage-content').hasChildNodes()) {
                fetchAndRenderCloudinaryUsage();
            }
        };

        window.fetchAndRenderAnalytics = async function() {
            const loadingEl = document.getElementById('analytics-loading');
            const contentEl = document.getElementById('analytics-content');
            
            loadingEl.style.display = 'block';
            contentEl.classList.add('hidden');
            contentEl.innerHTML = '';

            const startDate = document.getElementById('stats-start-date').value;
            const endDate = document.getElementById('stats-end-date').value;

            if (!startDate || !endDate) {
                loadingEl.innerHTML = '<p class="text-gray-400">Seleziona un intervallo di date.</p>';
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/global-stats?startDate=${startDate}&endDate=${endDate}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Errore nel caricamento delle statistiche.');
                }
                const stats = await response.json();
                
                stats.sort((a, b) => b.totalRevenue - a.totalRevenue);

                if (stats.length === 0) {
                     contentEl.innerHTML = `<p class="text-gray-500 text-center col-span-full">Nessun dato trovato per l'intervallo selezionato.</p>`;
                } else {
                    stats.forEach(resto => {
                        const statsHtml = `
                            <div class="stats-card p-4 cursor-pointer hover:bg-blue-50" onclick="window.viewRestaurantAnalytics('${resto.id}', '${resto.name}')">
                                <h3 class="font-bold text-xl mb-3 text-gray-800">${resto.name}</h3>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p class="text-sm text-gray-500">Incasso</p>
                                        <p class="text-2xl font-bold text-green-600">${resto.totalRevenue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm text-gray-500">Conti Chiusi</p>
                                        <p class="text-2xl font-bold text-gray-800">${resto.sessionCount}</p>
                                    </div>
                                    <div>
                                        <p class="text-sm text-gray-500">Piatti Venduti</p>
                                        <p class="text-2xl font-bold text-gray-800">${resto.dishesSold}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-blue-600 mt-2 text-center">Clicca per dettagli completi</p>
                            </div>
                        `;
                        contentEl.innerHTML += statsHtml;
                    });
                }
                contentEl.classList.remove('hidden');

            } catch (error) {
                showToast(error.message, 'error');
                contentEl.innerHTML = `<p class="text-red-600 text-center col-span-full">${error.message}</p>`;
                contentEl.classList.remove('hidden');
            } finally {
                loadingEl.style.display = 'none';
            }
        }

        async function fetchAndRenderCloudinaryUsage() {
            const loadingEl = document.getElementById('usage-loading');
            const contentEl = document.getElementById('usage-content');
            const errorEl = document.getElementById('usage-error');

            loadingEl.style.display = 'block';
            contentEl.classList.add('hidden');
            errorEl.classList.add('hidden');

            try {
                const response = await fetch(`${backendUrl}/cloudinary-usage`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Errore generico dal server.' }));
                    throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
                }
                const usage = await response.json();
                
                let usageHtml = `
                    <div class="elegant-card p-4 text-center">
                        <p class="text-sm text-blue-600">Piano Attuale: <span class="font-bold">${usage.plan}</span></p>`;
                
                if (usage.credits?.reset_at) {
                    const resetDate = new Date(usage.credits.reset_at).toLocaleDateString('it-IT');
                    usageHtml += `<p class="text-sm text-blue-600">Il piano si rinnoverà il: <span class="font-bold">${resetDate}</span></p>`;
                }
                usageHtml += `</div>`;
                
                if (usage.credits) {
                    usageHtml += createUsageBar('Crediti', usage.credits.usage, usage.credits.limit);
                }
                if (usage.storage) {
                    usageHtml += createUsageBar('Spazio di Archiviazione (GB)', usage.storage.usage / 1e9, usage.storage.limit / 1e9, 2);
                }
                if (usage.transformations) {
                    usageHtml += createUsageBar('Trasformazioni Immagini', usage.transformations.usage, usage.transformations.limit);
                }
                if (usage.bandwidth) {
                     usageHtml += createUsageBar('Traffico di Rete (GB)', usage.bandwidth.usage / 1e9, usage.bandwidth.limit / 1e9, 2);
                }

                contentEl.innerHTML = usageHtml;
                contentEl.classList.remove('hidden');

            } catch (error) {
                console.error("Cloudinary Usage Error:", error);
                errorEl.textContent = `Impossibile caricare i dati di utilizzo: ${error.message}`;
                errorEl.classList.remove('hidden');
            } finally {
                loadingEl.style.display = 'none';
            }
        }

        function createUsageBar(title, used, limit, decimals = 0) {
            if (typeof used === 'undefined' || typeof limit === 'undefined') return '';
            const usedFormatted = used.toLocaleString('it-IT', { maximumFractionDigits: decimals });
            const limitFormatted = limit.toLocaleString('it-IT', { maximumFractionDigits: decimals });
            const percentage = limit > 0 ? (used / limit) * 100 : 0;
            
            return `
                <div class="elegant-card p-4">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-semibold text-gray-700">${title}</h4>
                        <span class="text-sm font-medium text-gray-500">${usedFormatted} / ${limitFormatted}</span>
                    </div>
                    <div class="progress-bar h-4 w-full">
                        <div class="progress-bar-inner" style="width: ${Math.min(100, percentage).toFixed(2)}%;"></div>
                    </div>
                </div>
            `;
        }

        // Initialize statistics with 30-day default
        function initializeStatisticsDefaults() {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 29); // Last 30 days
            
            const startInput = document.getElementById('stats-start-date');
            const endInput = document.getElementById('stats-end-date');
            
            if (startInput && endInput) {
                startInput.valueAsDate = startDate;
                endInput.valueAsDate = endDate;
                
                // Set 30-day button as active
                document.querySelectorAll('#analitiche .btn').forEach(btn => btn.classList.remove('active'));
                const thirtyDayButton = document.querySelector('#analitiche button[onclick="setStatsDateFilter(30)"]');
                if (thirtyDayButton) {
                    thirtyDayButton.classList.add('active');
                }
                
                // Load analytics immediately if we're already on the analytics view
                const analyticsSection = document.getElementById('analitiche');
                if (analyticsSection && !analyticsSection.classList.contains('hidden')) {
                    fetchAndRenderAnalytics();
                }
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            fetchRestaurants();
            initializeStatisticsDefaults();
            showView('ristoranti');
            
            // Add click handlers for date filter buttons
            document.querySelectorAll('#statistiche .tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const daysBack = parseInt(e.target.getAttribute('onclick').match(/\d+/)[0]);
                    setStatsDateFilter(daysBack);
                });
            });
        });
    </script>
</body>
</html>
