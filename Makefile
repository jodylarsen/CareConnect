# CareConnect Frontend & Backend Development Makefile

.PHONY: help install start stop clean logs status publish publish-setup publish-status publish-stop publish-clean databricks-credits

# Project directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend

# Databricks CLI path
DATABRICKS_CLI := ~/.local/bin/databricks

# Default target
help:
	@echo "CareConnect Development Commands:"
	@echo ""
	@echo "  make install    - Install all dependencies (backend + frontend)"
	@echo "  make start      - Start both backend (port 3001) and frontend (port 3000)"
	@echo "  make stop       - Stop both backend and frontend servers"
	@echo "  make clean      - Clean up processes and temporary files"
	@echo "  make logs       - Show logs from running processes"
	@echo "  make status     - Check status of backend and frontend"
	@echo "  make backend    - Start only the backend server"
	@echo "  make frontend   - Start only the frontend server"
	@echo "  make build      - Build frontend for production"
	@echo ""
	@echo "Databricks Deployment:"
	@echo "  make publish-setup - Install Databricks CLI and configure deployment"
	@echo "  make publish       - Deploy CareConnect as a Databricks App"
	@echo "  make publish-status - Check Databricks app deployment status"
	@echo "  make publish-stop  - Stop the Databricks app"
	@echo "  make publish-clean - Remove the Databricks app completely"
	@echo "  make databricks-credits - Check remaining Databricks trial credits"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && npm install
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && npm install
	@echo "✅ All dependencies installed"

# Start both backend and frontend
start:
	@echo "🚀 Starting CareConnect backend and frontend..."
	@echo "📡 Backend will start on http://localhost:3001"
	@echo "🌐 Frontend will start on http://localhost:3000"
	@echo "📝 Logs will be saved to backend.log and frontend.log"
	@echo ""
	@make stop 2>/dev/null || true
	@sleep 1
	@echo "Starting backend server..."
	cd $(BACKEND_DIR) && nohup node server.js > ../backend.log 2>&1 & echo $$! > ../backend.pid
	@sleep 2
	@echo "Starting frontend server..."
	cd $(FRONTEND_DIR) && nohup npm start > ../frontend.log 2>&1 & echo $$! > ../frontend.pid
	@sleep 3
	@echo ""
	@echo "✅ Services started successfully!"
	@echo "🔗 Backend API: http://localhost:3001/api/health"
	@echo "🌐 Frontend App: http://localhost:3000"
	@echo ""
	@echo "Use 'make logs' to view logs or 'make stop' to stop all services"

# Start only backend
backend:
	@echo "📡 Starting backend server only..."
	@make stop-backend 2>/dev/null || true
	@sleep 1
	cd $(BACKEND_DIR) && nohup node server.js > ../backend.log 2>&1 & echo $$! > ../backend.pid
	@sleep 2
	@echo "✅ Backend started on http://localhost:3001"

# Start only frontend
frontend:
	@echo "🌐 Starting frontend server only..."
	@make stop-frontend 2>/dev/null || true
	@sleep 1
	cd $(FRONTEND_DIR) && nohup npm start > ../frontend.log 2>&1 & echo $$! > ../frontend.pid
	@sleep 3
	@echo "✅ Frontend started on http://localhost:3000"

# Stop both services
stop: stop-backend stop-frontend
	@echo "🛑 All services stopped"

# Stop backend only
stop-backend:
	@echo "Stopping backend server..."
	@if [ -f backend.pid ]; then \
		kill -TERM $$(cat backend.pid) 2>/dev/null || true; \
		rm -f backend.pid; \
	fi
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@echo "✅ Backend stopped"

# Stop frontend only
stop-frontend:
	@echo "Stopping frontend server..."
	@if [ -f frontend.pid ]; then \
		kill -TERM $$(cat frontend.pid) 2>/dev/null || true; \
		rm -f frontend.pid; \
	fi
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@pkill -f "react-scripts" 2>/dev/null || true
	@echo "✅ Frontend stopped"

# Clean up all processes and files
clean: stop
	@echo "🧹 Cleaning up..."
	@rm -f backend.pid frontend.pid backend.log frontend.log
	@lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
	@pkill -f "node server.js" 2>/dev/null || true
	@pkill -f "react-scripts" 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Show logs from both services
logs:
	@echo "📋 Recent logs from backend and frontend:"
	@echo ""
	@echo "=== BACKEND LOGS ==="
	@if [ -f backend.log ]; then tail -20 backend.log; else echo "No backend logs found"; fi
	@echo ""
	@echo "=== FRONTEND LOGS ==="
	@if [ -f frontend.log ]; then tail -20 frontend.log; else echo "No frontend logs found"; fi

# Check status of services
status:
	@echo "📊 Service Status:"
	@echo ""
	@if lsof -i:3001 >/dev/null 2>&1; then \
		echo "✅ Backend (port 3001): RUNNING"; \
	else \
		echo "❌ Backend (port 3001): STOPPED"; \
	fi
	@if lsof -i:3000 >/dev/null 2>&1; then \
		echo "✅ Frontend (port 3000): RUNNING"; \
	else \
		echo "❌ Frontend (port 3000): STOPPED"; \
	fi
	@echo ""
	@if lsof -i:3001 >/dev/null 2>&1 && lsof -i:3000 >/dev/null 2>&1; then \
		echo "🔗 Backend API: http://localhost:3001/api/health"; \
		echo "🌐 Frontend App: http://localhost:3000"; \
		echo "🩺 Databricks Test: http://localhost:3000 → 'Databricks Test' tab"; \
	fi

# Development shortcuts
dev: start
restart: stop start
health-check:
	@echo "🏥 Health Check:"
	@echo ""
	@curl -s http://localhost:3001/api/health 2>/dev/null | jq . 2>/dev/null || echo "Backend not responding"
	@echo ""
	@curl -s -I http://localhost:3000 2>/dev/null | head -1 || echo "Frontend not responding"

# Quick test of the Databricks integration
test-databricks:
	@echo "🧪 Testing Databricks Integration:"
	@echo ""
	@echo "Testing backend health..."
	@curl -s http://localhost:3001/api/health | jq .
	@echo ""
	@echo "Testing Databricks connection..."
	@curl -s -X POST http://localhost:3001/api/databricks/test | jq .

# Build for production
build:
	@echo "🏗️ Building for production..."
	cd $(FRONTEND_DIR) && npm run build
	@echo "✅ Build complete - files in ./$(FRONTEND_DIR)/build/"

# Databricks App Deployment Setup
publish-setup:
	@echo "🔧 Setting up Databricks CLI for app deployment..."
	@echo ""
	@echo "Installing/updating Databricks CLI (new version)..."
	@pip uninstall -y databricks-cli 2>/dev/null || true
	@pip install --upgrade databricks-cli || echo "❌ Failed to install databricks-cli. Please install Python and pip first."
	@echo ""
	@echo "📋 Next steps to complete setup:"
	@echo "1. Configure Databricks CLI with your workspace:"
	@echo "   databricks configure --host https://your-workspace.cloud.databricks.com"
	@echo ""
	@echo "2. Provide the following information when prompted:"
	@echo "   - Databricks Host: https://your-workspace.cloud.databricks.com"
	@echo "   - Personal Access Token: (create in User Settings > Access Tokens)"
	@echo ""
	@echo "3. Verify configuration:"
	@echo "   databricks workspace list"
	@echo "   databricks apps list"
	@echo ""
	@echo "4. Run 'make publish' to deploy the app"
	@echo ""

# Deploy CareConnect as a Databricks App
publish:
	@echo "🚀 Deploying CareConnect as a Databricks App..."
	@echo ""
	@echo "Step 1: Building production frontend..."
	@make build
	@echo ""
	@echo "Step 2: Validating app.yaml configuration..."
	@if [ ! -f app.yaml ]; then \
		echo "❌ app.yaml not found. Please ensure configuration file exists."; \
		exit 1; \
	fi
	@echo "✅ Configuration file found"
	@echo ""
	@echo "Step 3: Checking Databricks CLI configuration..."
	@$(DATABRICKS_CLI) workspace list / > /dev/null 2>&1 || (echo "❌ Databricks CLI not configured. Run 'make publish-setup' first." && exit 1)
	@echo "✅ Databricks CLI configured"
	@echo ""
	@echo "Step 4: Creating app directory in Databricks workspace..."
	@$(DATABRICKS_CLI) workspace mkdir /Apps/CareConnect 2>/dev/null || echo "Directory already exists"
	@echo ""
	@echo "Step 5: Uploading application files..."
	@echo "  📤 Uploading app.yaml..."
	@$(DATABRICKS_CLI) workspace import /Apps/CareConnect/app.yaml --file app.yaml --language PYTHON --format SOURCE --overwrite
	@echo "  📤 Uploading requirements.txt..."
	@$(DATABRICKS_CLI) workspace import /Apps/CareConnect/requirements.txt --file requirements.txt --language PYTHON --format SOURCE --overwrite
	@echo "  📤 Uploading frontend build..."
	@cd $(FRONTEND_DIR)/build && tar -czf ../../careconnect-build.tar.gz . && cd ../..
	@$(DATABRICKS_CLI) workspace import /Apps/CareConnect/frontend-build.tar.gz --file careconnect-build.tar.gz --format RAW --overwrite
	@rm -f careconnect-build.tar.gz
	@echo ""
	@echo "Step 6: Creating app deployment script..."
	@echo '#!/bin/bash' > deploy-app.py
	@echo 'import os' >> deploy-app.py
	@echo 'import subprocess' >> deploy-app.py
	@echo 'import tarfile' >> deploy-app.py
	@echo '' >> deploy-app.py
	@echo '# Extract frontend build files' >> deploy-app.py
	@echo 'with tarfile.open("/Workspace/Apps/CareConnect/frontend-build.tar.gz", "r:gz") as tar:' >> deploy-app.py
	@echo '    tar.extractall("/tmp/careconnect-frontend")' >> deploy-app.py
	@echo '' >> deploy-app.py
	@echo '# Move to workspace location' >> deploy-app.py
	@echo 'os.makedirs("/Workspace/Apps/CareConnect/frontend/build", exist_ok=True)' >> deploy-app.py
	@echo 'subprocess.run(["cp", "-r", "/tmp/careconnect-frontend/*", "/Workspace/Apps/CareConnect/frontend/build/"])' >> deploy-app.py
	@$(DATABRICKS_CLI) workspace import /Apps/CareConnect/deploy-app.py --file deploy-app.py --language PYTHON --format SOURCE --overwrite
	@rm -f deploy-app.py
	@echo ""
	@echo "Step 7: Deploying Databricks App..."
	@echo "📋 Creating app with the following configuration:"
	@echo "   - Name: CareConnect"
	@echo "   - Path: /Apps/CareConnect"
	@echo "   - Port: 8080"
	@echo ""
	@$(DATABRICKS_CLI) apps create careconnect \
		--source-code-path /Apps/CareConnect \
		--description "CareConnect AI-powered healthcare search and recommendation platform" || \
		echo "ℹ️  App may already exist. Updating instead..."
	@$(DATABRICKS_CLI) apps update careconnect \
		--source-code-path /Apps/CareConnect \
		--description "CareConnect AI-powered healthcare search and recommendation platform" || \
		echo "❌ Failed to update app. Please check Databricks CLI configuration."
	@echo ""
	@echo "Step 8: Starting the app..."
	@$(DATABRICKS_CLI) apps start careconnect || echo "App may already be running"
	@echo ""
	@echo "🎉 Deployment complete!"
	@echo ""
	@echo "📱 Your CareConnect app should now be available at:"
	@echo "   https://your-workspace.cloud.databricks.com/apps/careconnect"
	@echo ""
	@echo "🔍 To check app status:"
	@echo "   databricks apps get careconnect"
	@echo ""
	@echo "📊 To view app logs:"
	@echo "   databricks apps logs careconnect"
	@echo ""
	@echo "🛑 To stop the app:"
	@echo "   databricks apps stop careconnect"
	@echo ""

# Check Databricks app deployment status
publish-status:
	@echo "📊 Checking CareConnect Databricks App status..."
	@$(DATABRICKS_CLI) apps get careconnect || echo "❌ App not found or not deployed"

# Stop Databricks app
publish-stop:
	@echo "🛑 Stopping CareConnect Databricks App..."
	@$(DATABRICKS_CLI) apps stop careconnect

# Remove Databricks app
publish-clean:
	@echo "🗑️  Removing CareConnect Databricks App..."
	@$(DATABRICKS_CLI) apps delete careconnect --confirm
	@$(DATABRICKS_CLI) workspace rm -r /Apps/CareConnect

# Check Databricks credit usage and remaining balance
databricks-credits:
	@echo "💰 Checking Databricks credit usage and remaining balance..."
	@echo ""
	@echo "📊 Recent Usage (Last 30 days):"
	@echo "=================================="
	@$(DATABRICKS_CLI) account billable-usage list \
		--start-date $$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null || date --date='30 days ago' +%Y-%m-%d 2>/dev/null || echo "2024-05-01") \
		--end-date $$(date +%Y-%m-%d) 2>/dev/null || \
		echo "❌ Unable to fetch usage data. This could be due to:" && \
		echo "   • CLI not configured with account-level permissions" && \
		echo "   • Trial account limitations" && \
		echo "   • Network connectivity issues"
	@echo ""
	@echo "🏦 Alternative Methods to Check Credits:"
	@echo "========================================"
	@echo "1. 🌐 Account Console (Recommended):"
	@echo "   • Go to your Databricks workspace"
	@echo "   • Click profile icon → 'Manage Account'"
	@echo "   • Navigate to 'Billing & Usage' or 'Usage'"
	@echo ""
	@echo "2. ⚙️  Workspace Admin Settings:"
	@echo "   • In workspace, click settings gear (⚙️)"
	@echo "   • Go to 'Admin Console' → 'Billing'"
	@echo ""
	@echo "3. 📱 Quick Workspace Check:"
	@echo "   • Look for usage indicators in workspace UI"
	@echo "   • Check notification banners for credit warnings"
	@echo ""
	@echo "💡 Tips for Managing Credits:"
	@echo "============================"
	@echo "• Set up billing alerts at 50%, 75%, 90% usage"
	@echo "• Monitor Apps usage in billing dashboard"
	@echo "• Static apps (like CareConnect) use minimal credits"
	@echo "• ML/AI endpoint calls consume more credits"
	@echo "• Stop unused clusters and apps to conserve credits"