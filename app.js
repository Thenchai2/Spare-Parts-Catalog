const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxaauQYW6enZ6evREbyx2hEFTnxO5MWPE1EWR4_NmdlFZICi5nozTTUHzPGrGi5t-0V/exec";

        // Global State
        window.globalTanks = [];
        window.currentUser = null; 
        
        // App State
        window.lossThresholds = { ready: 30, stock: 45, customer: 7 };
        window.editingTankId = null;
        let html5QrCode = null;
        let pendingTankId = null;
        let labelQrCodeObj = null; // ตัวแปรสำหรับ QR Code ในหน้าสร้าง Label
        
        // Custom Auth State
        window.appUser = null; 
        window.appRole = null; 

        // Pagination and Filters State
        window.stockCurrentPage = 1;
        const stockPageSize = 20;

        window.manageCurrentPage = 1;
        const managePageSize = 20;

        window.searchCurrentPage = 1;
        const searchPageSize = 20;

        window.historyCurrentPage = 1;
        const historyPageSize = 10;
        window.currentHistoryTankId = null;

        window.resetStockPageAndRender = () => {
            window.stockCurrentPage = 1;
            renderStockTable();
        };

        window.changeStockPage = (dir) => {
            window.stockCurrentPage += dir;
            renderStockTable();
        };

        window.resetManagePageAndRender = () => {
            window.manageCurrentPage = 1;
            renderManageTable();
        };

        window.changeManagePage = (dir) => {
            window.manageCurrentPage += dir;
            renderManageTable();
        };

        window.resetSearchPageAndRender = () => {
            window.searchCurrentPage = 1;
            renderSearchTable();
        };

        window.changeSearchPage = (dir) => {
            window.searchCurrentPage += dir;
            renderSearchTable();
        };

        window.clearDashboardFilters = () => {
            document.getElementById('dash-filter-start').value = '';
            document.getElementById('dash-filter-end').value = '';
            document.getElementById('dash-filter-month').value = 'all';
            document.getElementById('dash-filter-year').value = 'all';
            renderDashboard();
        }; 

        // Database of Roles
        const SYSTEM_USERS = {
            'ADMIN': { pass: 'Admin', role: 'admin' },
            'RM': { pass: '123', role: 'rm' },
            'PACKING': { pass: '123', role: 'packing' },
            'WH': { pass: '123', role: 'wh' }
        };

        // Initialize Label Date to Today & Session Restore
        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const dateInput = document.getElementById('label-input-date');
            if(dateInput) {
                dateInput.value = `${yyyy}-${mm}-${dd}`;
            }

            // Restore session storage for auto login (refresh persistence)
            const savedUser = sessionStorage.getItem('appUser');
            const savedRole = sessionStorage.getItem('appRole');
            if (savedUser && savedRole) {
                window.appUser = savedUser;
                window.appRole = savedRole;
                
                document.getElementById('display-user-desktop').innerText = window.appUser;
                document.getElementById('display-user-mobile').innerText = window.appUser;

                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-wrapper').style.display = 'flex';
                
                applyPermissions();
                window.fetchDatabase(false);
                switchTab('dashboard');
            }
        });

        // --- AUTHENTICATION LOGIC ---
        window.togglePasswordVisibility = () => {
            const passInput = document.getElementById('login-pass');
            const icon = document.getElementById('toggle-pass-icon');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                passInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        };

        window.handleLogin = () => {
            const userInput = document.getElementById('login-user').value.trim().toUpperCase();
            const passInput = document.getElementById('login-pass').value;

            if (SYSTEM_USERS[userInput] && SYSTEM_USERS[userInput].pass === passInput) {
                window.appUser = userInput === 'ADMIN' ? 'Admin' : document.getElementById('login-user').value.trim();
                window.appRole = SYSTEM_USERS[userInput].role;
                
                // Save to sessionStorage for persistent session (survives refreshes, cleared when tab closes)
                sessionStorage.setItem('appUser', window.appUser);
                sessionStorage.setItem('appRole', window.appRole);

                document.getElementById('display-user-desktop').innerText = window.appUser;
                document.getElementById('display-user-mobile').innerText = window.appUser;

                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-wrapper').style.display = 'flex';
                
                applyPermissions();
                
                // Fetch data from Google Drive immediately upon login
                window.fetchDatabase(false);
                switchTab('dashboard');
                
                document.getElementById('login-user').value = '';
                document.getElementById('login-pass').value = '';
            } else {
                Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบล้มเหลว', text: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง', confirmButtonColor: '#2563eb' });
            }
        };

        window.handleLogout = () => {
            Swal.fire({
                title: 'ออกจากระบบ?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: 'ออกจากระบบ',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.appUser = null;
                    window.appRole = null;
                    
                    // Clear persistent session storage
                    sessionStorage.removeItem('appUser');
                    sessionStorage.removeItem('appRole');
                    
                    stopScanner();
                    document.getElementById('app-wrapper').style.display = 'none';
                    document.getElementById('login-screen').style.display = 'flex';
                }
            });
        };

        function applyPermissions() {
            // Nav elements
            const manageNavDesktop = document.getElementById('nav-desktop-manage');
            const manageNavMobile = document.getElementById('nav-mobile-manage');
            const labelNavDesktop = document.getElementById('nav-desktop-label');
            const labelNavMobile = document.getElementById('nav-mobile-label');
            const btnDeleteAllHistory = document.getElementById('btn-delete-all-history');
            
            // Scan action buttons
            const scanContainer = document.getElementById('scan-action-container');
            const btnReceive = document.getElementById('btn-action-receive');
            const btnPack = document.getElementById('btn-action-pack');
            const btnDispatch = document.getElementById('btn-action-dispatch');

            if (window.appRole === 'admin') {
                if(manageNavDesktop) manageNavDesktop.style.display = 'flex';
                if(manageNavMobile) manageNavMobile.style.display = 'flex';
                if(labelNavDesktop) labelNavDesktop.style.display = 'flex';
                if(labelNavMobile) labelNavMobile.style.display = 'flex';
                if(btnDeleteAllHistory) btnDeleteAllHistory.style.display = 'flex';
                
                scanContainer.className = 'grid grid-cols-3 gap-2 md:gap-4 mb-8';
                btnReceive.style.display = 'block';
                btnPack.style.display = 'block';
                btnDispatch.style.display = 'block';
                
                setScanAction('receive');
            } else {
                if(manageNavDesktop) manageNavDesktop.style.display = 'none';
                if(manageNavMobile) manageNavMobile.style.display = 'none';
                if(labelNavDesktop) labelNavDesktop.style.display = 'none';
                if(labelNavMobile) labelNavMobile.style.display = 'none';
                if(btnDeleteAllHistory) btnDeleteAllHistory.style.display = 'none';
                
                scanContainer.className = 'grid grid-cols-1 gap-2 md:gap-4 mb-8 max-w-xs mx-auto';
                btnReceive.style.display = 'none';
                btnPack.style.display = 'none';
                btnDispatch.style.display = 'none';

                if (window.appRole === 'rm') {
                    btnReceive.style.display = 'block';
                    setScanAction('receive');
                } else if (window.appRole === 'packing') {
                    btnPack.style.display = 'block';
                    setScanAction('pack');
                } else if (window.appRole === 'wh') {
                    btnDispatch.style.display = 'block';
                    setScanAction('dispatch');
                }
            }
        }

        // Update UI for Auth Status
        function updateAuthUI(status, isError = false) {
            const mob = document.getElementById('auth-status-mobile');
            const desk = document.getElementById('auth-status-desktop');
            
            if (mob) {
                mob.innerText = status;
                mob.className = `text-[9px] px-1.5 py-0.5 rounded text-white font-bold ${isError ? 'bg-red-600' : 'bg-green-500'}`;
            }
            if (desk) {
                desk.innerText = status;
                desk.className = `text-[9px] px-2 py-0.5 rounded-lg font-bold ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
            }
        }

        // --- GOOGLE DRIVE DATABASE INTEGRATION ---
        window.fetchDatabase = async (silent = false) => {
            if (!silent) {
                updateAuthUI("กำลังโหลด...", false);
                Swal.fire({
                    title: 'กำลังเชื่อมต่อระบบ...',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }
            try {
                const response = await fetch(GAS_API_URL);
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const data = await response.json();
                
                window.currentUser = { uid: "gas-user" }; // Mock user object to bypass verification checks
                
                // Map database settings and tanks
                window.lossThresholds = data.settings || { ready: 30, stock: 45, customer: 7 };
                
                const tanksObj = data.tanks || {};
                window.globalTanks = Object.keys(tanksObj).map(key => ({
                    id: key,
                    ...tanksObj[key]
                }));
                
                updateAuthUI("ออนไลน์", false);
                
                if (!silent) {
                    Swal.close();
                }
                
                // Re-render UI
                if (window.appUser) {
                    if(document.getElementById('view-dashboard').classList.contains('active')) renderDashboard();
                    if(document.getElementById('view-stock').classList.contains('active')) renderStockTable();
                    if(document.getElementById('view-manage').classList.contains('active')) renderManageTable();
                    if(document.getElementById('view-search').classList.contains('active')) renderSearchTable();
                }
            } catch (err) {
                console.error("Error loading database:", err);
                updateAuthUI("เชื่อมต่อล้มเหลว", true);
                if (!silent) {
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        text: 'ไม่สามารถโหลดข้อมูลจาก Google Drive ได้: ' + err.message,
                        confirmButtonColor: '#ef4444'
                    });
                    document.getElementById('dashboard-container').innerHTML = `<div class="p-4 bg-red-100 text-red-700 rounded-xl text-center text-xs">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}</div>`;
                }
            }
        };

        window.saveToServer = async (action, payload) => {
            try {
                const response = await fetch(GAS_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify({ action, payload })
                });
                if (!response.ok) throw new Error("HTTP error " + response.status);
                const result = await response.json();
                if (result.status === "error") throw new Error(result.message);
                return result;
            } catch (error) {
                console.error("API Save Error:", error);
                throw error;
            }
        };

        // Polling background updates every 30 seconds
        setInterval(() => {
            if (window.appUser) {
                window.fetchDatabase(true);
            }
        }, 30000);

        // --- LABEL GENERATOR LOGIC ---
        window.adjustLabelScale = () => {
            const scaleWrapper = document.getElementById('scale-wrapper');
            const scaler = document.getElementById('preview-scaler');
            if (scaleWrapper && scaler) {
                const currentWidth = scaleWrapper.clientWidth;
                // คำนวณสเกลเทียบกับความกว้างต้นฉบับ 794px
                const scale = currentWidth / 794;
                scaler.style.transform = `scale(${scale})`;
            }
        };

        // ตรวจจับการย่อขยายหน้าต่าง เพื่ออัปเดตสเกลพรีวิว
        window.addEventListener('resize', () => {
            if (document.getElementById('view-label').classList.contains('active')) {
                window.adjustLabelScale();
            }
        });

        window.renderLabelPreview = () => {
            const product = document.getElementById('label-input-product').value || 'JSP';
            const tank = document.getElementById('label-input-tank').value || 'PK 001';
            const color = document.getElementById('label-input-color').value || '#ff0000';
            
            const dateVal = document.getElementById('label-input-date').value;
            let dateStr = "";
            if (dateVal && dateVal.includes('-')) {
                const parts = dateVal.split('-'); // YYYY-MM-DD
                if (parts.length === 3) {
                    dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            if (!dateStr) {
                const today = new Date();
                dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            }

            // Update DOM Elements for Preview
            const productEl = document.getElementById('label-product-name');
            const tankEl = document.getElementById('label-tank-id');
            
            productEl.innerText = product;
            tankEl.innerText = tank;
            document.getElementById('label-top-bg').style.backgroundColor = color;
            document.getElementById('label-date').innerText = `Date: ${dateStr}`;

            // --- Auto-scale Font Size Logic ---
            // รีเซ็ตขนาดกลับไปเป็นขนาดสูงสุดก่อนเพื่อวัดความกว้างที่แท้จริง
            productEl.style.fontSize = '150px';
            tankEl.style.fontSize = '160px';

            // คำนวณปรับย่อขนาดตัวอักษรของ "ชื่อผลิตภัณฑ์" ไม่ให้ล้นกรอบ (ความกว้างสุด ~730px)
            const maxProductWidth = 794 - 60; 
            if (productEl.scrollWidth > maxProductWidth) {
                const newProductSize = Math.floor(150 * (maxProductWidth / productEl.scrollWidth));
                productEl.style.fontSize = `${newProductSize}px`;
            }

            // คำนวณปรับย่อขนาดตัวอักษรของ "รหัสถัง" ไม่ให้ล้นกรอบ (ความกว้างสุด ~500px)
            const maxTankWidth = (794 * 0.70) - 60; 
            if (tankEl.scrollWidth > maxTankWidth) {
                const newTankSize = Math.floor(160 * (maxTankWidth / tankEl.scrollWidth));
                tankEl.style.fontSize = `${newTankSize}px`;
            }

            // Create QR Text String (e.g. "JSP PK 001")
            const qrText = `${product} ${tank}`.replace(/\s+/g, ' ').trim();
            document.getElementById('label-input-qrtext').value = qrText;

            // Generate QR Code inside the preview container
            const qrContainer = document.getElementById('label-qrcode');
            qrContainer.innerHTML = ''; // Clear old QR code
            
            labelQrCodeObj = new QRCode(qrContainer, {
                text: qrText,
                width: 170,  // ขนาดพิกเซล QR Code แบบคมชัดสำหรับปรินท์
                height: 170,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });

            // ปรับขนาดการแสดงผลให้พอดีหน้าจอ
            setTimeout(() => { window.adjustLabelScale(); }, 50);
        };

        window.downloadLabelPDF = async () => {
            Swal.fire({
                title: 'กำลังสร้าง PDF...',
                text: 'กรุณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                // ปิด Scale ชั่วคราวเพื่อให้จับภาพได้ขนาดเต็ม 100%
                const scaler = document.getElementById('preview-scaler');
                const oldTransform = scaler.style.transform;
                scaler.style.transform = 'scale(1)';
                
                const element = document.getElementById('label-preview-container');
                // ใช้ html2canvas จับภาพ Container ของ Label (ปรับสเกลเพื่อความคมชัด)
                const canvas = await html2canvas(element, { scale: 3, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                
                // คืนค่า Scale กลับไป
                scaler.style.transform = oldTransform;
                
                // สร้างไฟล์ PDF ด้วย jsPDF (ขนาด A5 แนวนอน, หน่วยมิลลิเมตร)
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('l', 'mm', 'a5'); 
                
                // นำภาพที่วาดไปแปะลงหน้า PDF ขนาด 210 x 148 mm
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 148);
                
                const product = document.getElementById('label-input-product').value || 'Tank';
                const tank = document.getElementById('label-input-tank').value || '001';
                pdf.save(`Label_${product}_${tank}.pdf`);
                
                Swal.close();
                Swal.fire({ icon: 'success', title: 'ดาวน์โหลดสำเร็จ!', timer: 1500, showConfirmButton: false });
            } catch (error) {
                console.error("PDF Error:", error);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
            }
        };

        // --- Core Functions ---
        function calculateDays(timestampMs) {
            if (!timestampMs) return 0;
            return Math.floor(Math.abs(Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
        }

        function getExpectedLossInfo(status, days, customThresholds = null) {
            const thresholds = customThresholds || window.lossThresholds;
            if (status === 'Ready to Use' && days > thresholds.ready) return 'คาดการณ์หายในโรงงาน';
            if (status === 'Stock' && days > thresholds.stock) return 'คาดการณ์หายในคลังสินค้า';
            if (status === 'Customer' && days > thresholds.customer) return 'คาดการณ์หายระหว่างขนส่ง';
            return null;
        }

        window.renderDashboard = function renderDashboard() {
            const container = document.getElementById('dashboard-container');
            if (window.globalTanks.length === 0) {
                container.innerHTML = `<div class="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm"><i class="fa-solid fa-folder-open text-gray-200 text-4xl mb-3"></i><p class="text-gray-400 text-sm font-bold">ยังไม่มีข้อมูลถังในระบบ</p></div>`;
                return;
            }

            // Filter global tanks based on dashboard filters
            const filterStartVal = document.getElementById('dash-filter-start').value;
            const filterEndVal = document.getElementById('dash-filter-end').value;
            const filterMonthVal = document.getElementById('dash-filter-month').value;
            const filterYearVal = document.getElementById('dash-filter-year').value;

            let filteredTanks = window.globalTanks;

            if (filterStartVal || filterEndVal || filterMonthVal !== 'all' || filterYearVal !== 'all') {
                filteredTanks = window.globalTanks.filter(tank => {
                    if (!tank.updatedAt) return false;
                    const date = new Date(tank.updatedAt);
                    
                    // Filter Start Date
                    if (filterStartVal) {
                        const start = new Date(filterStartVal);
                        start.setHours(0,0,0,0);
                        if (date < start) return false;
                    }
                    // Filter End Date
                    if (filterEndVal) {
                        const end = new Date(filterEndVal);
                        end.setHours(23,59,59,999);
                        if (date > end) return false;
                    }
                    // Filter Month (0-11)
                    if (filterMonthVal !== 'all') {
                        if (date.getMonth() !== parseInt(filterMonthVal)) return false;
                    }
                    // Filter Year
                    if (filterYearVal !== 'all') {
                        if (date.getFullYear() !== parseInt(filterYearVal)) return false;
                    }
                    return true;
                });
            }

            let counts = { ready: 0, stock: 0, customer: 0, inactive: 0, loss: 0 };
            let lossByStatus = { ready: 0, stock: 0, customer: 0, loss: 0 };
            const totalTanks = filteredTanks.length;

            filteredTanks.forEach(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                if (lossReason || tank.status === 'Loss') {
                    counts.loss++;
                    if (tank.status === 'Loss') {
                        lossByStatus.loss++;
                    } else if (tank.status === 'Ready to Use') {
                        lossByStatus.ready++;
                    } else if (tank.status === 'Stock') {
                        lossByStatus.stock++;
                    } else if (tank.status === 'Customer') {
                        lossByStatus.customer++;
                    }
                } else if (tank.status === 'Inactive') {
                    counts.inactive++;
                } else if (tank.status === 'Ready to Use') {
                    counts.ready++;
                } else if (tank.status === 'Stock') {
                    counts.stock++;
                } else if (tank.status === 'Customer') {
                    counts.customer++;
                }
            });

            // Destroy existing Charts before resetting container DOM to prevent memory leaks / canvas reuse errors
            if (window.propChartObj) {
                window.propChartObj.destroy();
                window.propChartObj = null;
            }
            if (window.monthlyChartObj) {
                window.monthlyChartObj.destroy();
                window.monthlyChartObj = null;
            }

            container.innerHTML = `
                <div class="mb-4 bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-5 md:p-6 text-white shadow-md flex items-center justify-between transition-transform hover:scale-[1.01]">
                    <div class="flex items-center gap-4 md:gap-6">
                        <div class="bg-white/20 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full shrink-0">
                            <i class="fa-solid fa-boxes-stacked text-white text-2xl md:text-3xl"></i>
                        </div>
                        <div>
                            <div class="text-base md:text-lg text-blue-50 font-bold">จำนวนถังในระบบ</div>
                            <div class="text-[10px] md:text-xs text-blue-200 mt-1 font-medium">ข้อมูลมูลถังทุกสถาณะ</div>
                        </div>
                    </div>
                    <div class="text-4xl md:text-5xl font-black text-white">${totalTanks} <span class="text-base font-bold text-blue-200">ใบ</span></div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div class="bg-blue-50 rounded-2xl p-4 md:p-6 border border-blue-100 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                        <i class="fa-solid fa-box-open text-blue-400 text-3xl md:text-4xl mb-3"></i>
                        <span class="text-xs md:text-sm text-blue-800 font-bold mb-1 text-center">ถังเปล่าพร้อมใช้</span>
                        <div class="text-3xl md:text-4xl font-black text-blue-600">${counts.ready} <span class="text-sm font-bold opacity-70">ใบ</span></div>
                    </div>

                    <div class="bg-yellow-50 rounded-2xl p-4 md:p-6 border border-yellow-100 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                        <i class="fa-solid fa-cubes text-yellow-500 text-3xl md:text-4xl mb-3"></i>
                        <span class="text-xs md:text-sm text-yellow-800 font-bold mb-1 text-center">บรรจุแล้วรอขาย</span>
                        <div class="text-3xl md:text-4xl font-black text-yellow-600">${counts.stock} <span class="text-sm font-bold opacity-70">ใบ</span></div>
                    </div>

                    <div class="bg-green-50 rounded-2xl p-4 md:p-6 border border-green-100 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                        <i class="fa-solid fa-truck-fast text-green-500 text-3xl md:text-4xl mb-3"></i>
                        <span class="text-xs md:text-sm text-green-800 font-bold mb-1 text-center">ขายแล้วรอกลับ</span>
                        <div class="text-3xl md:text-4xl font-black text-green-600">${counts.customer} <span class="text-sm font-bold opacity-70">ใบ</span></div>
                    </div>

                    <div class="bg-gray-50 rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-[1.02]">
                        <i class="fa-solid fa-ban text-gray-400 text-3xl md:text-4xl mb-3"></i>
                        <span class="text-xs md:text-sm text-gray-700 font-bold mb-1 text-center">ถังไม่พร้อมใช้งาน</span>
                        <div class="text-3xl md:text-4xl font-black text-gray-600">${counts.inactive} <span class="text-sm font-bold opacity-70">ใบ</span></div>
                    </div>
                </div>

                <div class="mt-3 md:mt-4 bg-red-50 rounded-2xl p-5 md:p-6 border border-red-200 shadow-sm transition-transform hover:scale-[1.01]">
                    <div class="flex items-center justify-between mb-${counts.loss > 0 ? '4' : '0'}">
                        <div class="flex items-center gap-4 md:gap-6">
                            <div class="bg-red-100 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full shrink-0">
                                <i class="fa-solid fa-triangle-exclamation text-red-500 text-2xl md:text-3xl"></i>
                            </div>
                            <div>
                                <div class="text-base md:text-lg text-red-800 font-black">คาดการณ์สูญหาย</div>
                                <div class="text-[10px] md:text-xs text-red-600 leading-snug mt-1 font-bold">
                                    ถังเปล่าไม่เคลื่อนไหวเกิน ${window.lossThresholds.ready} วัน &bull; บรรจุไม่เคลื่อนไหวเกิน ${window.lossThresholds.stock} วัน &bull; ส่งขายแล้วไม่รับกลับเกิน ${window.lossThresholds.customer} วัน
                                </div>
                            </div>
                        </div>
                        <div class="text-4xl md:text-5xl font-black text-red-600">${counts.loss} <span class="text-base font-bold text-red-400">ใบ</span></div>
                    </div>
                    ${counts.loss > 0 ? `
                    <div class="border-t border-red-200 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        ${lossByStatus.ready > 0 ? `
                        <div class="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 border border-red-100 shadow-sm">
                            <i class="fa-solid fa-industry text-blue-400 text-sm shrink-0"></i>
                            <div>
                                <div class="text-[10px] text-gray-500 font-bold leading-none mb-0.5">หายในโรงงาน</div>
                                <div class="text-base font-black text-red-600">${lossByStatus.ready} <span class="text-xs font-bold text-gray-400">ใบ</span></div>
                            </div>
                        </div>` : ''}
                        ${lossByStatus.stock > 0 ? `
                        <div class="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 border border-red-100 shadow-sm">
                            <i class="fa-solid fa-warehouse text-yellow-500 text-sm shrink-0"></i>
                            <div>
                                <div class="text-[10px] text-gray-500 font-bold leading-none mb-0.5">หายในคลังสินค้า</div>
                                <div class="text-base font-black text-red-600">${lossByStatus.stock} <span class="text-xs font-bold text-gray-400">ใบ</span></div>
                            </div>
                        </div>` : ''}
                        ${lossByStatus.customer > 0 ? `
                        <div class="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 border border-red-100 shadow-sm">
                            <i class="fa-solid fa-truck-fast text-green-500 text-sm shrink-0"></i>
                            <div>
                                <div class="text-[10px] text-gray-500 font-bold leading-none mb-0.5">หายระหว่างขนส่ง</div>
                                <div class="text-base font-black text-red-600">${lossByStatus.customer} <span class="text-xs font-bold text-gray-400">ใบ</span></div>
                            </div>
                        </div>` : ''}
                        ${lossByStatus.loss > 0 ? `
                        <div class="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2 border border-red-100 shadow-sm">
                            <i class="fa-solid fa-ban text-red-400 text-sm shrink-0"></i>
                            <div>
                                <div class="text-[10px] text-gray-500 font-bold leading-none mb-0.5">ตั้งสูญหาย</div>
                                <div class="text-base font-black text-red-600">${lossByStatus.loss} <span class="text-xs font-bold text-gray-400">ใบ</span></div>
                            </div>
                        </div>` : ''}
                    </div>
                    ` : ''}
                </div>

                <!-- Visuals and charts section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <!-- กราฟสัดส่วนถัง และ สัดส่วนแต่ละเดือน -->
                    <div class="space-y-6">
                        <!-- สัดส่วนถังปัจจุบัน -->
                        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 class="text-sm font-black text-gray-800 mb-4 flex items-center gap-1.5"><i class="fa-solid fa-chart-pie text-blue-500"></i> สัดส่วนสถานะถังทั้งหมด</h3>
                            <div class="w-full max-w-[240px] mx-auto h-[240px] relative">
                                <canvas id="propChart" class="w-full h-full"></canvas>
                            </div>
                        </div>
                        
                        <!-- จำนวนความเคลื่อนไหวแต่ละเดือน -->
                        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 class="text-sm font-black text-gray-800 mb-4 flex items-center gap-1.5"><i class="fa-solid fa-chart-column text-blue-500"></i> สัดส่วนถังแต่ละเดือน (ความเคลื่อนไหวรายเดือน)</h3>
                            <div class="w-full h-[220px]">
                                <canvas id="monthlyChart" class="w-full h-full"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ตารางถังยอดฮิต 10 อันดับ -->
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
                        <div>
                            <h3 class="text-sm font-black text-gray-800 mb-4 flex items-center gap-1.5"><i class="fa-solid fa-fire text-orange-500"></i> ถังที่มีการใช้งานบ่อยสุด 10 อันดับ</h3>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr class="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                                            <th class="p-3 w-12 text-center">ลำดับ</th>
                                            <th class="p-3">รหัสถัง</th>
                                            <th class="p-3">สถานะปัจจุบัน</th>
                                            <th class="p-3 text-center">รอบใช้งาน</th>
                                            <th class="p-3">ใช้งานล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody id="top-tanks-tbody" class="divide-y divide-gray-100 font-medium">
                                        <!-- Rows injected by JS -->
                                    </tbody>
                                </table>
                            </div>
                            <div id="top-tanks-empty" class="text-center py-16 text-gray-400 font-bold hidden">
                                <i class="fa-solid fa-folder-open text-3xl mb-2 text-gray-200 block"></i>
                                ไม่พบข้อมูล
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Initialize Charts
            // 1. Doughnut Chart for Proportions
            const ctxProp = document.getElementById('propChart').getContext('2d');
            window.propChartObj = new Chart(ctxProp, {
                type: 'doughnut',
                data: {
                    labels: ['ถังเปล่าพร้อมใช้', 'บรรจุแล้วรอขาย', 'ขายแล้วรอกลับ', 'ถังไม่พร้อมใช้งาน', 'สูญหาย'],
                    datasets: [{
                        data: [counts.ready, counts.stock, counts.customer, counts.inactive, counts.loss],
                        backgroundColor: [
                            '#3b82f6', // blue-500
                            '#eab308', // yellow-500
                            '#22c55e', // green-500
                            '#9ca3af', // gray-400
                            '#ef4444'  // red-500
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { family: 'Sarabun', size: 10, weight: 'bold' },
                                boxWidth: 10,
                                padding: 8
                            }
                        }
                    },
                    cutout: '60%'
                }
            });

            // 2. Grouped Bar Chart: รับเข้า / บรรจุ / จ่ายออก รายเดือน (คำนวณตามตัวกรอง วันที่/เดือน/ปี)
            const monthsThai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            
            let chartMonths = [];

            if (filterStartVal && filterEndVal) {
                // กรองตามช่วงวันที่กำหนด (Start - End)
                let cur = new Date(filterStartVal);
                cur.setDate(1);
                cur.setHours(0,0,0,0);
                const end = new Date(filterEndVal);
                end.setDate(1);
                end.setHours(23,59,59,999);
                
                while (cur <= end && chartMonths.length < 24) {
                    chartMonths.push({
                        month: cur.getMonth(),
                        year: cur.getFullYear(),
                        label: `${monthsThai[cur.getMonth()]} ${cur.getFullYear() + 543}`
                    });
                    cur.setMonth(cur.getMonth() + 1);
                }
            } else if (filterYearVal !== 'all') {
                const targetYear = parseInt(filterYearVal);
                if (filterMonthVal !== 'all') {
                    // ระบุทั้งเดือนและปี: แสดง 6 เดือนย้อนหลังจนถึงเดือนที่เลือก
                    const targetMonth = parseInt(filterMonthVal);
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date(targetYear, targetMonth - i, 1);
                        chartMonths.push({
                            month: d.getMonth(),
                            year: d.getFullYear(),
                            label: `${monthsThai[d.getMonth()]} ${d.getFullYear() + 543}`
                        });
                    }
                } else {
                    // ระบุเฉพาะปี: แสดงทั้ง 12 เดือนของปีนั้น
                    for (let m = 0; m < 12; m++) {
                        chartMonths.push({
                            month: m,
                            year: targetYear,
                            label: `${monthsThai[m]} ${targetYear + 543}`
                        });
                    }
                }
            } else if (filterMonthVal !== 'all') {
                // ระบุเฉพาะเดือน: แสดง 6 เดือนย้อนหลังจนถึงเดือนนั้นของปีปัจจุบัน
                const targetMonth = parseInt(filterMonthVal);
                const targetYear = new Date().getFullYear();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(targetYear, targetMonth - i, 1);
                    chartMonths.push({
                        month: d.getMonth(),
                        year: d.getFullYear(),
                        label: `${monthsThai[d.getMonth()]} ${d.getFullYear() + 543}`
                    });
                }
            } else {
                // ค่าเริ่มต้น: 6 เดือนย้อนหลังจากปัจจุบัน
                const today = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    chartMonths.push({
                        month: d.getMonth(),
                        year: d.getFullYear(),
                        label: `${monthsThai[d.getMonth()]} ${d.getFullYear() + 543}`
                    });
                }
            }

            // Count by action type per month according to filters
            const receiveCounts  = Array(chartMonths.length).fill(0);
            const packCounts     = Array(chartMonths.length).fill(0);
            const dispatchCounts = Array(chartMonths.length).fill(0);

            window.globalTanks.forEach(tank => {
                if (tank.history && Array.isArray(tank.history)) {
                    tank.history.forEach(hist => {
                        if (!hist.date || !hist.action) return;
                        const histDate = new Date(hist.date);

                        if (filterStartVal) {
                            const s = new Date(filterStartVal);
                            s.setHours(0,0,0,0);
                            if (histDate < s) return;
                        }
                        if (filterEndVal) {
                            const e = new Date(filterEndVal);
                            e.setHours(23,59,59,999);
                            if (histDate > e) return;
                        }
                        
                        const m = histDate.getMonth();
                        const y = histDate.getFullYear();

                        for (let i = 0; i < chartMonths.length; i++) {
                            if (chartMonths[i].month === m && chartMonths[i].year === y) {
                                const act = hist.action;
                                if (act.startsWith('รับเข้า'))        receiveCounts[i]++;
                                else if (act.startsWith('บรรจุ'))      packCounts[i]++;
                                else if (act.startsWith('จ่ายออก'))    dispatchCounts[i]++;
                                break;
                            }
                        }
                    });
                }
            });

            const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
            window.monthlyChartObj = new Chart(ctxMonthly, {
                type: 'bar',
                data: {
                    labels: chartMonths.map(m => m.label),
                    datasets: [
                        {
                            label: 'รับเข้า',
                            data: receiveCounts,
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        },
                        {
                            label: 'บรรจุ',
                            data: packCounts,
                            backgroundColor: '#eab308',
                            borderRadius: 4
                        },
                        {
                            label: 'จ่ายออก',
                            data: dispatchCounts,
                            backgroundColor: '#8b5cf6',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                font: { family: 'Sarabun', size: 10, weight: 'bold' },
                                boxWidth: 10,
                                padding: 10,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, font: { family: 'Sarabun', size: 9 } },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            ticks: { font: { family: 'Sarabun', size: 9 } },
                            grid: { display: false }
                        }
                    }
                }
            });

            // 3. Top 10 Tanks table rendering
            const topTanksTbody = document.getElementById('top-tanks-tbody');
            const topTanksEmpty = document.getElementById('top-tanks-empty');
            
            // Sort by cycleCount descending
            const sortedByUsage = [...filteredTanks].sort((a, b) => (b.cycleCount || 0) - (a.cycleCount || 0));
            const top10 = sortedByUsage.slice(0, 10);

            if (top10.length === 0) {
                topTanksTbody.innerHTML = '';
                topTanksEmpty.classList.remove('hidden');
            } else {
                topTanksEmpty.classList.add('hidden');
                topTanksTbody.innerHTML = top10.map((tank, idx) => {
                    let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                    let statusText = tank.status;
                    const days = calculateDays(tank.updatedAt);
                    const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                    if (lossReason || tank.status === 'Loss') {
                        badgeClass = 'bg-red-50 text-red-700 border-red-200';
                        statusText = 'คาดการณ์สูญหาย';
                    } else if (tank.status === 'Ready to Use') {
                        badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                        statusText = 'ถังเปล่าพร้อมใช้';
                    } else if (tank.status === 'Stock') {
                        badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                        statusText = 'บรรจุแล้วรอขาย';
                    } else if (tank.status === 'Customer') {
                        badgeClass = 'bg-green-50 text-green-700 border-green-200';
                        statusText = 'ขายแล้วรอกลับ';
                    } else if (tank.status === 'Inactive') {
                        badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                        statusText = 'ถังไม่พร้อมใช้งาน';
                    }

                    const lastActiveDate = tank.updatedAt ? new Date(tank.updatedAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) : '-';

                    return `
                        <tr class="hover:bg-gray-50/80 transition-colors">
                            <td class="p-3 text-center font-bold text-gray-500">${idx + 1}</td>
                            <td class="p-3 font-black text-gray-800 whitespace-nowrap">${tank.id}</td>
                            <td class="p-3 whitespace-nowrap"><span class="${badgeClass} border px-2 py-0.5 rounded-lg text-[9px] font-bold">${statusText}</span></td>
                            <td class="p-3 text-center"><span class="text-[9px] text-purple-600 font-bold border border-purple-200 bg-purple-50 px-2 py-0.5 rounded-lg">${tank.cycleCount || 0} รอบ</span></td>
                            <td class="p-3 text-gray-500 whitespace-nowrap text-[10px]">${lastActiveDate}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        window.renderStockTable = () => {
            const tbody = document.getElementById('stock-table-body');
            const emptyState = document.getElementById('stock-empty-state');
            const emptyText = document.getElementById('stock-empty-text');
            const countBadge = document.getElementById('stock-count-badge');
            const paginationContainer = document.getElementById('stock-pagination-container');
            
            if (!window.globalTanks || window.globalTanks.length === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ยังไม่มีข้อมูลถังในระบบ';
                countBadge.innerText = 'จำนวนทั้งหมด: 0 ใบ';
                paginationContainer.style.display = 'none';
                return;
            }

            const searchQuery = document.getElementById('search-stock-input').value.toUpperCase().trim();
            const statusFilter = document.getElementById('filter-stock-status').value;

            const filtered = window.globalTanks.filter(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                if (searchQuery && !tank.id.includes(searchQuery)) return false;
                if (statusFilter === 'all') return true;
                if (statusFilter === 'loss') return !!lossReason || tank.status === 'Loss';
                if (lossReason || tank.status === 'Loss') return false; 
                if (statusFilter === 'ready' && tank.status === 'Ready to Use') return true;
                if (statusFilter === 'stock' && tank.status === 'Stock') return true;
                if (statusFilter === 'customer' && tank.status === 'Customer') return true;
                if (statusFilter === 'inactive' && tank.status === 'Inactive') return true;

                return false;
            });

            const totalItems = filtered.length;
            countBadge.innerText = `จำนวนทั้งหมด: ${totalItems} ใบ`;

            if (totalItems === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ไม่พบข้อมูลตามเงื่อนไขที่ระบุ';
                paginationContainer.style.display = 'none';
                return;
            }

            emptyState.classList.add('hidden');
            paginationContainer.style.display = 'flex';
            
            filtered.sort((a, b) => b.updatedAt - a.updatedAt);

            // Pagination logic
            const totalPages = Math.ceil(totalItems / stockPageSize) || 1;
            if (window.stockCurrentPage > totalPages) window.stockCurrentPage = totalPages;
            if (window.stockCurrentPage < 1) window.stockCurrentPage = 1;

            document.getElementById('stock-page-num').innerText = window.stockCurrentPage;
            document.getElementById('stock-page-total').innerText = totalPages;

            document.getElementById('btn-stock-prev').disabled = (window.stockCurrentPage === 1);
            document.getElementById('btn-stock-next').disabled = (window.stockCurrentPage === totalPages);

            const startIndex = (window.stockCurrentPage - 1) * stockPageSize;
            const endIndex = startIndex + stockPageSize;
            const paginatedItems = filtered.slice(startIndex, endIndex);

            tbody.innerHTML = paginatedItems.map(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);
                
                let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                let statusText = tank.status;
                let dayColor = 'text-gray-600';
                
                if (lossReason || tank.status === 'Loss') {
                    badgeClass = 'bg-red-50 text-red-700 border-red-200';
                    statusText = 'คาดการณ์สูญหาย';
                    dayColor = 'text-red-600';
                } else if (tank.status === 'Ready to Use') {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    statusText = 'ถังเปล่าพร้อมใช้';
                } else if (tank.status === 'Stock') {
                    badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    statusText = 'บรรจุแล้วรอขาย';
                } else if (tank.status === 'Customer') {
                    badgeClass = 'bg-green-50 text-green-700 border-green-200';
                    statusText = 'ขายแล้วรอกลับ';
                } else if (tank.status === 'Inactive') {
                    badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                    statusText = 'ถังไม่พร้อมใช้งาน';
                }

                return `
                    <tr class="hover:bg-gray-50/80 transition-colors">
                        <td class="p-4 font-black text-gray-800 whitespace-nowrap text-sm">${tank.id}</td>
                        <td class="p-4 whitespace-nowrap">
                            <span class="${badgeClass} border px-2.5 py-1 rounded-lg text-[10px] font-bold">${statusText}</span>
                            ${lossReason ? `<div class="text-[9px] text-red-500 mt-1 font-semibold leading-tight"><i class="fa-solid fa-circle-exclamation mr-1"></i>${lossReason}</div>` : ''}
                        </td>
                        <td class="p-4 whitespace-nowrap text-center">
                            <span class="text-[10px] text-purple-600 font-bold border border-purple-200 bg-purple-50 px-2.5 py-1 rounded-lg inline-block w-max mx-auto"><i class="fa-solid fa-arrows-spin mr-1"></i> ${tank.cycleCount || 0} รอบ</span>
                        </td>
                        <td class="p-4 text-[10px] text-gray-500 whitespace-nowrap">
                            <div class="font-bold text-gray-700">${new Date(tank.updatedAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</div>
                            <div>${new Date(tank.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                        </td>
                        <td class="p-4 text-sm font-black ${dayColor} whitespace-nowrap text-center">
                            ${days} <span class="text-[10px] font-normal text-gray-400">วัน</span>
                        </td>
                    </tr>
                `;
            }).join('');
        };


        window.renderManageTable = () => {
            const tbody = document.getElementById('manage-table-body');
            const emptyState = document.getElementById('manage-empty-state');
            const emptyText = document.getElementById('manage-empty-text');
            const countBadge = document.getElementById('manage-count-badge');
            const paginationContainer = document.getElementById('manage-pagination-container');
            
            if (!window.globalTanks || window.globalTanks.length === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ยังไม่มีข้อมูลถังในระบบ';
                countBadge.innerText = 'จำนวนทั้งหมด: 0 ใบ';
                paginationContainer.style.display = 'none';
                return;
            }

            const searchQuery = document.getElementById('search-manage-input').value.toUpperCase().trim();
            const statusFilter = document.getElementById('filter-manage-status').value;

            const filtered = window.globalTanks.filter(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                if (searchQuery && !tank.id.includes(searchQuery)) return false;
                if (statusFilter === 'all') return true;
                if (statusFilter === 'loss') return !!lossReason || tank.status === 'Loss';
                if (lossReason || tank.status === 'Loss') return false; 
                if (statusFilter === 'ready' && tank.status === 'Ready to Use') return true;
                if (statusFilter === 'stock' && tank.status === 'Stock') return true;
                if (statusFilter === 'customer' && tank.status === 'Customer') return true;
                if (statusFilter === 'inactive' && tank.status === 'Inactive') return true;

                return false;
            });

            const totalItems = filtered.length;
            countBadge.innerText = `จำนวนทั้งหมด: ${totalItems} ใบ`;

            if (totalItems === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ไม่พบข้อมูลตามเงื่อนไขที่ระบุ';
                paginationContainer.style.display = 'none';
                return;
            }

            emptyState.classList.add('hidden');
            paginationContainer.style.display = 'flex';
            
            filtered.sort((a, b) => b.updatedAt - a.updatedAt);

            // Pagination logic
            const totalPages = Math.ceil(totalItems / managePageSize) || 1;
            if (window.manageCurrentPage > totalPages) window.manageCurrentPage = totalPages;
            if (window.manageCurrentPage < 1) window.manageCurrentPage = 1;

            document.getElementById('manage-page-num').innerText = window.manageCurrentPage;
            document.getElementById('manage-page-total').innerText = totalPages;

            document.getElementById('btn-manage-prev').disabled = (window.manageCurrentPage === 1);
            document.getElementById('btn-manage-next').disabled = (window.manageCurrentPage === totalPages);

            const startIndex = (window.manageCurrentPage - 1) * managePageSize;
            const endIndex = startIndex + managePageSize;
            const paginatedItems = filtered.slice(startIndex, endIndex);

            tbody.innerHTML = paginatedItems.map(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);
                
                let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                let statusText = tank.status;
                
                if (lossReason || tank.status === 'Loss') {
                    badgeClass = 'bg-red-50 text-red-700 border-red-200';
                    statusText = 'คาดการณ์สูญหาย';
                } else if (tank.status === 'Ready to Use') {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    statusText = 'ถังเปล่าพร้อมใช้';
                } else if (tank.status === 'Stock') {
                    badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    statusText = 'บรรจุแล้วรอขาย';
                } else if (tank.status === 'Customer') {
                    badgeClass = 'bg-green-50 text-green-700 border-green-200';
                    statusText = 'ขายแล้วรอกลับ';
                } else if (tank.status === 'Inactive') {
                    badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                    statusText = 'ถังไม่พร้อมใช้งาน';
                }
                
                const customThreshStr = tank.customThresholds ? encodeURIComponent(JSON.stringify(tank.customThresholds)) : '';

                return `
                    <tr class="hover:bg-gray-50/80 transition-colors">
                        <td class="p-4 font-black text-gray-800 whitespace-nowrap text-sm">
                            ${tank.id}
                            <div class="mt-1 flex flex-col items-start gap-1">
                                <span class="text-[9px] text-purple-600 font-bold border border-purple-200 bg-purple-50 px-1.5 py-0.5 rounded flex items-center w-max"><i class="fa-solid fa-arrows-spin mr-1"></i> รอบใช้งาน: ${tank.cycleCount || 0}</span>
                                ${tank.customThresholds ? `<span class="text-[9px] text-blue-500 font-normal border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded w-max">ตั้งค่าเฉพาะ</span>` : ''}
                            </div>
                        </td>
                        <td class="p-4 whitespace-nowrap">
                            <span class="${badgeClass} border px-2.5 py-1 rounded-lg text-[10px] font-bold">${statusText}</span>
                            ${lossReason ? `<div class="text-[9px] text-red-500 mt-1 font-semibold leading-tight"><i class="fa-solid fa-circle-exclamation mr-1"></i>${lossReason}</div>` : ''}
                        </td>
                        <td class="p-4 text-[10px] text-gray-500 whitespace-nowrap">
                            <div class="font-bold text-gray-700">${new Date(tank.updatedAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</div>
                            <div>${new Date(tank.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                        </td>
                        <td class="p-4 whitespace-nowrap text-center">
                            <button onclick="openEditTankModal('${tank.id}', '${tank.status}', '${customThreshStr}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-blue-100 shadow-sm">
                                <i class="fa-solid fa-pen mr-1"></i> แก้ไขข้อมูล
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        window.toggleCustomThresholdInputs = () => {
            const isChecked = document.getElementById('edit-use-custom-thresholds').checked;
            const container = document.getElementById('custom-threshold-inputs');
            if (isChecked) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        };

        window.openEditTankModal = (tankId, currentStatus, customThresholdsStr) => {
            window.editingTankId = tankId;
            document.getElementById('edit-modal-tank-id').innerText = tankId;
            document.getElementById('edit-tank-status').value = currentStatus;
            
            const custom = customThresholdsStr ? JSON.parse(decodeURIComponent(customThresholdsStr)) : null;
            const useCheckbox = document.getElementById('edit-use-custom-thresholds');
            
            if (custom) {
                useCheckbox.checked = true;
                document.getElementById('edit-custom-ready').value = custom.ready || window.lossThresholds.ready;
                document.getElementById('edit-custom-stock').value = custom.stock || window.lossThresholds.stock;
                document.getElementById('edit-custom-customer').value = custom.customer || window.lossThresholds.customer;
            } else {
                useCheckbox.checked = false;
                document.getElementById('edit-custom-ready').value = window.lossThresholds.ready;
                document.getElementById('edit-custom-stock').value = window.lossThresholds.stock;
                document.getElementById('edit-custom-customer').value = window.lossThresholds.customer;
            }
            
            toggleCustomThresholdInputs();
            document.getElementById('edit-tank-modal').classList.remove('hidden');
        };

        window.closeEditTankModal = () => {
            document.getElementById('edit-tank-modal').classList.add('hidden');
            window.editingTankId = null;
        };

        window.submitEditTank = async () => {
            if (!window.editingTankId) return;
            const newStatus = document.getElementById('edit-tank-status').value;
            const tankId = window.editingTankId;
            const useCustom = document.getElementById('edit-use-custom-thresholds').checked;
            
            let customThresholds = null;
            let noteUpdateText = `ปรับสถานะเป็น: ${document.getElementById('edit-tank-status').options[document.getElementById('edit-tank-status').selectedIndex].text}`;
            
            if (useCustom) {
                customThresholds = {
                    ready: parseInt(document.getElementById('edit-custom-ready').value) || window.lossThresholds.ready,
                    stock: parseInt(document.getElementById('edit-custom-stock').value) || window.lossThresholds.stock,
                    customer: parseInt(document.getElementById('edit-custom-customer').value) || window.lossThresholds.customer
                };
                noteUpdateText += ` (ใช้การตั้งค่าสูญหายเฉพาะ)`;
            }
            
            Swal.fire({ title: 'กำลังบันทึกการแก้ไข...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
            
            try {
                const existingTank = window.globalTanks.find(t => t.id === tankId);
                let history = existingTank ? (existingTank.history || []) : [];
                
                history.push({
                    date: Date.now(),
                    action: 'แก้ไขข้อมูล (ระบบจัดการ)',
                    user: window.appUser,
                    note: noteUpdateText
                });

                const updatedTank = {
                    status: newStatus,
                    updatedAt: Date.now(),
                    history: history,
                    cycleCount: existingTank ? (existingTank.cycleCount || 0) : 0
                };
                if (customThresholds) {
                    updatedTank.customThresholds = customThresholds;
                }

                await saveToServer("save_tanks", { [tankId]: updatedTank });
                await window.fetchDatabase(true);
                
                window.closeEditTankModal();
                Swal.fire({ icon: 'success', title: 'อัปเดตข้อมูลสำเร็จ', timer: 1500, showConfirmButton: false });
            } catch (e) {
                console.error(e);
                Swal.fire('ข้อผิดพลาด', 'อัปเดตไม่สำเร็จ กรุณาลองใหม่', 'error');
            }
        };

        window.confirmDeleteTank = () => {
            const tankId = window.editingTankId;
            Swal.fire({
                title: 'ยืนยันการลบข้อมูล?',
                text: `คุณต้องการลบประวัติของถัง "${tankId}" ออกจากระบบใช่หรือไม่? (การกระทำนี้ไม่สามารถกู้คืนได้)`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> ลบข้อมูลถาวร',
                cancelButtonText: 'ยกเลิก'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
                        await saveToServer("delete_tank_with_files", { tankId: tankId });
                        await window.fetchDatabase(true);
                        window.closeEditTankModal();
                        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ!', text: `ข้อมูลถัง ${tankId} ถูกลบแล้ว`, timer: 1500, showConfirmButton: false });
                    } catch (error) {
                        console.error(error);
                        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
                    }
                }
            });
        };

        window.openSettingsModal = () => {
            document.getElementById('setting-days-ready').value = window.lossThresholds.ready;
            document.getElementById('setting-days-stock').value = window.lossThresholds.stock;
            document.getElementById('setting-days-customer').value = window.lossThresholds.customer;
            document.getElementById('settings-modal').classList.remove('hidden');
        };

        window.closeSettingsModal = () => {
            document.getElementById('settings-modal').classList.add('hidden');
        };

        window.submitSettings = async () => {
            const r = parseInt(document.getElementById('setting-days-ready').value) || 30;
            const s = parseInt(document.getElementById('setting-days-stock').value) || 45;
            const c = parseInt(document.getElementById('setting-days-customer').value) || 7;
            
            Swal.fire({ title: 'กำลังบันทึกการตั้งค่า...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
            
            try {
                await saveToServer("save_settings", { ready: r, stock: s, customer: c });
                
                window.lossThresholds = { ready: r, stock: s, customer: c };
                await window.fetchDatabase(true);
                
                window.closeSettingsModal();
                Swal.fire({ icon: 'success', title: 'ตั้งค่าสำเร็จ', timer: 1500, showConfirmButton: false });
                
            } catch(e) {
                console.error(e);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกการตั้งค่าได้', 'error');
            }
        };

        // --- SCANNER LOGIC ---
        function showCameraError() {
            document.getElementById('camera-error-text').classList.remove('hidden');
            document.getElementById('camera-error-text').innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> ไม่พบกล้องที่ใช้งานได้`;
            document.getElementById('reader').innerHTML = '<div class="text-gray-500 text-center p-8 pt-12 text-sm font-bold"><i class="fa-solid fa-camera-rotate text-3xl mb-3 text-gray-400"></i><br>กล้องไม่พร้อมใช้งาน<br><span class="text-xs font-normal">กรุณาสแกนจากรูปภาพหรือกรอกรหัส</span></div>';
        }

        async function startScanner() {
            if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
            if (html5QrCode.isScanning) return;

            const config = { fps: 15, qrbox: { width: 250, height: 250 } };
            
            Html5Qrcode.getCameras().then(async devices => {
                if (devices && devices.length > 0) {
                    try {
                        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
                    } catch (err) {
                        try {
                            await html5QrCode.start(devices[0].id, config, onScanSuccess, () => {});
                        } catch (fallbackErr) {
                            showCameraError();
                        }
                    }
                } else {
                    showCameraError();
                }
            }).catch(err => {
                showCameraError();
            });
        }

        async function stopScanner() {
            if (html5QrCode && html5QrCode.isScanning) {
                await html5QrCode.stop().catch(err => console.error(err));
            }
        }

        function onScanSuccess(decodedText) {
            stopScanner();
            const audio = new Audio('https://actions.google.com/sounds/v1/ui/button_click.ogg');
            audio.play().catch(e=>{});
            
            const tankId = decodedText.trim().toUpperCase();
            document.getElementById('manual-tank-id').value = tankId;
            
            Swal.fire({ 
                icon: 'success', 
                title: 'สแกนสำเร็จ', 
                text: 'กรุณาตรวจสอบรหัสถังและกดปุ่ม "ยืนยัน" เพื่อบันทึก', 
                timer: 2000, 
                showConfirmButton: false 
            });
        }

        window.handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

            Swal.fire({ title: 'กำลังถอดรหัสรูปภาพ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            html5QrCode.scanFile(file, true)
                .then(text => { 
                    Swal.close(); 
                    
                    const tankId = text.trim().toUpperCase();
                    document.getElementById('manual-tank-id').value = tankId;
                    event.target.value = ''; 
                    
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'ถอดรหัสภาพสำเร็จ', 
                        text: 'กรุณาตรวจสอบรหัสถังและกดปุ่ม "ยืนยัน" เพื่อบันทึก', 
                        timer: 2000, 
                        showConfirmButton: false 
                    });
                })
                .catch(err => { 
                    Swal.fire({ icon: 'error', title: 'ไม่พบ QR Code', text: 'รูปภาพอาจไม่ชัด กรุณาลองใหม่หรือสแกนสด' }); 
                    event.target.value = ''; 
                });
        };

        // --- ระบบแปลงลิงก์ Google Drive ---
        window.extractDriveImage = (url) => {
            if (!url) return null;
            let id = null;
            const matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
            
            if (matchD) id = matchD[1];
            else if (matchId) id = matchId[1];
            
            if (id) return `https://lh3.googleusercontent.com/d/${id}`;
            if (url.startsWith('http')) return url; // คืนค่าลิงก์เดิมถ้าไม่ใช่ Drive
            
            return null;
        };

        window.processScannedTank = (tankId) => {
            if (!window.currentUser || !window.appUser) {
                Swal.fire({ icon: 'info', title: 'รอสักครู่', text: 'กำลังตรวจสอบสิทธิ์การใช้งาน...' });
                return;
            }
            const action = document.getElementById('current-action').value;
            
            const existingTank = window.globalTanks.find(t => t.id === tankId);
            let skippedStep = null; 
            let isEditingStep = false;

            if (existingTank) {
                const historyList = existingTank.history || [];
                const lastEntry = historyList.length > 0 ? historyList[historyList.length - 1] : null;
                let isDuplicateStep = false;

                if (action === 'receive') {
                    if (existingTank.status === 'Ready to Use' || (existingTank.status === 'Inactive' && lastEntry && lastEntry.action && lastEntry.action.startsWith('รับเข้า'))) {
                        isDuplicateStep = true;
                    }
                } else if (action === 'pack') {
                    if (existingTank.status === 'Stock') {
                        isDuplicateStep = true;
                    }
                } else if (action === 'dispatch') {
                    if (existingTank.status === 'Customer') {
                        isDuplicateStep = true;
                    }
                }

                if (isDuplicateStep) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'ข้อมูลซ้ำซ้อน',
                        text: `ถังรหัส ${tankId} ได้ทำการบันทึกในกระบวนการนี้ไปแล้ว ไม่สามารถบันทึกซ้ำได้`,
                        confirmButtonColor: '#2563eb'
                    }).then(() => {
                        document.getElementById('manual-tank-id').value = '';
                        if (document.getElementById('view-scan').classList.contains('active')) startScanner();
                    });
                    return;
                }

                if (existingTank.status === 'Inactive' && (action === 'pack' || action === 'dispatch') && !isEditingStep) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่อนุญาตให้ทำรายการ',
                        text: `ถังรหัส ${tankId} มีสถานะ "ไม่พร้อมใช้งาน" (ชำรุด) ไม่สามารถนำไปบรรจุหรือจ่ายออกได้`,
                        confirmButtonColor: '#ef4444'
                    }).then(() => {
                        document.getElementById('manual-tank-id').value = '';
                        if (document.getElementById('view-scan').classList.contains('active')) startScanner();
                    });
                    return; 
                }

                if (!isEditingStep) {
                    if (existingTank.status === 'Ready to Use' && action === 'dispatch') skippedStep = 'บรรจุ';
                    if (existingTank.status === 'Stock' && action === 'receive') skippedStep = 'จ่ายออก';
                    if (existingTank.status === 'Customer' && action === 'pack') skippedStep = 'รับเข้า';
                }

            } else {
                if (action === 'pack') skippedStep = 'รับเข้า';
                if (action === 'dispatch') skippedStep = 'รับเข้าและบรรจุ';
            }

            const openReceiveModal = () => {
                pendingTankId = tankId;
                window.pendingIsEditingStep = isEditingStep;
                document.getElementById('modal-tank-id').innerText = `${tankId}`;
                
                const warning = document.getElementById('receive-modal-skip-warning');
                if (isEditingStep) {
                    if (warning) {
                        warning.classList.remove('hidden');
                        warning.innerHTML = `✏️ <b>แก้ไขข้อมูลสเต็ปเดิม (รับเข้า)</b> — เป็นการบันทึกซ้ำภายใน 24 ชม.`;
                    }
                } else if (skippedStep) {
                    if (warning) {
                        warning.classList.remove('hidden');
                        warning.innerHTML = `⚠️ ข้ามขั้นตอน "${skippedStep}"`;
                    }
                } else {
                    if (warning) warning.classList.add('hidden');
                }

                // Default or pre-fill
                let defaultValve = "ดี", defaultStruct = "ดี", defaultBase = "ดี", defaultReady = "พร้อมนำไปบรรจุ", defaultNote = "";
                if (isEditingStep && existingTank && existingTank.history && existingTank.history.length > 0) {
                    const lastEntry = existingTank.history[existingTank.history.length - 1];
                    if (lastEntry && lastEntry.note) {
                        const matchCond = lastEntry.note.match(/\[วาล์ว:(.*?), โครง:(.*?), ฐาน:(.*?), สถานะ:(.*?)\]/);
                        if (matchCond) {
                            defaultValve = matchCond[1];
                            defaultStruct = matchCond[2];
                            defaultBase = matchCond[3];
                            defaultReady = matchCond[4];
                        }
                        const noteParts = lastEntry.note.split(']');
                        if (noteParts.length > 1) {
                            defaultNote = noteParts[noteParts.length - 1].trim();
                        }
                    }
                }

                document.getElementById('cond-note').value = defaultNote;
                document.querySelectorAll('input[type=radio][name=cond-valve]').forEach(radio => radio.checked = (radio.value === defaultValve));
                document.querySelectorAll('input[type=radio][name=cond-struct]').forEach(radio => radio.checked = (radio.value === defaultStruct));
                document.querySelectorAll('input[type=radio][name=cond-base]').forEach(radio => radio.checked = (radio.value === defaultBase));
                document.querySelectorAll('input[type=radio][name=cond-ready]').forEach(radio => radio.checked = (radio.value === defaultReady));

                if (window.clearAllConditionImages) window.clearAllConditionImages();
                if (window.toggleConditionImageField) window.toggleConditionImageField();
                document.getElementById('condition-modal').classList.remove('hidden');
            };

            const resetScannerUI = () => {
                document.getElementById('manual-tank-id').value = '';
                if (document.getElementById('view-scan').classList.contains('active')) startScanner();
            };

            if (action === 'receive') {
                window.pendingSkippedStep = skippedStep; 
                if (skippedStep) {
                    Swal.fire({
                        title: 'พบการข้ามกระบวนการ!',
                        html: `ถัง <b>${tankId}</b> ข้ามกระบวนการ <b class="text-red-500">"${skippedStep}"</b><br>คุณต้องการดำเนินการรับเข้าต่อหรือไม่?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#f59e0b',
                        cancelButtonColor: '#9ca3af',
                        confirmButtonText: 'ยืนยัน (ข้ามขั้นตอน)',
                        cancelButtonText: 'ยกเลิก'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            openReceiveModal();
                        } else {
                            resetScannerUI();
                        }
                    });
                } else {
                    openReceiveModal();
                }
            } else {
                if (action === 'pack') {
                    openPackModal(tankId, skippedStep, isEditingStep);
                } else {
                    openDispatchModal(tankId, skippedStep, isEditingStep);
                }
            }
        };

        // ===================== PACK MODAL LOGIC =====================
        let packPendingTankId = null;
        let packPendingSkippedStep = null;
        window.packImageData = { base64: null, name: null };

        window.openPackModal = (tankId, skippedStep, isEditingStep = false) => {
            packPendingTankId = tankId;
            packPendingSkippedStep = skippedStep;
            window.pendingIsEditingStep = isEditingStep;
            document.getElementById('pack-modal-tank-id').innerText = tankId;
            const warning = document.getElementById('pack-modal-skip-warning');
            if (isEditingStep) {
                warning.classList.remove('hidden');
                warning.innerHTML = `✏️ <b>แก้ไขข้อมูลสเต็ปเดิม (บรรจุ)</b> — เป็นการบันทึกซ้ำภายใน 24 ชม.`;
            } else if (skippedStep) {
                warning.classList.remove('hidden');
                warning.innerHTML = `⚠️ ข้ามขั้นตอน "${skippedStep}"`;
            } else {
                warning.classList.add('hidden');
            }
            clearPackImage();
            
            if (isEditingStep) {
                const btn = document.getElementById('btn-submit-pack');
                if (btn) {
                    btn.disabled = false;
                    btn.className = 'flex-1 px-4 py-4 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 transition-colors';
                    btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> ยืนยันแก้ไขบรรจุ';
                }
            }
            document.getElementById('pack-modal').classList.remove('hidden');
        };

        window.closePackModal = () => {
            document.getElementById('pack-modal').classList.add('hidden');
            clearPackImage();
            document.getElementById('manual-tank-id').value = '';
            if (document.getElementById('view-scan').classList.contains('active')) startScanner();
        };

        window.handlePackImageSelect = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                window.packImageData = { base64: e.target.result, name: `pack_${packPendingTankId}_${Date.now()}.jpg` };
                document.getElementById('pack-image-label').innerText = file.name;
                document.getElementById('pack-image-preview').src = e.target.result;
                document.getElementById('pack-image-preview-container').classList.remove('hidden');
                document.getElementById('btn-clear-pack-image').classList.remove('hidden');
                // Unlock submit
                const btn = document.getElementById('btn-submit-pack');
                btn.disabled = false;
                btn.className = 'flex-1 px-4 py-4 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 transition-colors';
                btn.innerHTML = window.pendingIsEditingStep ? '<i class="fa-solid fa-check mr-1"></i> ยืนยันแก้ไขบรรจุ' : '<i class="fa-solid fa-check mr-1"></i> ยืนยันบรรจุ';
            };
            reader.readAsDataURL(file);
        };

        window.clearPackImage = () => {
            window.packImageData = { base64: null, name: null };
            const fi = document.getElementById('pack-image');
            if (fi) fi.value = '';
            const lbl = document.getElementById('pack-image-label');
            if (lbl) lbl.innerText = 'เลือกหรือถ่ายภาพ';
            const prev = document.getElementById('pack-image-preview');
            if (prev) prev.src = '';
            const prevCont = document.getElementById('pack-image-preview-container');
            if (prevCont) prevCont.classList.add('hidden');
            const clearBtn = document.getElementById('btn-clear-pack-image');
            if (clearBtn) clearBtn.classList.add('hidden');
            // Lock submit if not editing
            const btn = document.getElementById('btn-submit-pack');
            if (btn && !window.pendingIsEditingStep) {
                btn.disabled = true;
                btn.className = 'flex-1 px-4 py-4 bg-gray-300 text-gray-500 rounded-xl font-bold transition-colors cursor-not-allowed';
                btn.innerHTML = '<i class="fa-solid fa-lock text-xs mr-1"></i> ยืนยัน';
            }
        };

        window.submitPackModal = async () => {
            const isEditing = window.pendingIsEditingStep;
            if (!window.packImageData.base64 && !isEditing) return;
            document.getElementById('pack-modal').classList.add('hidden');
            try {
                let imageUrl = null;
                if (window.packImageData.base64) {
                    Swal.fire({ title: 'กำลังอัปโหลดภาพ...', text: 'กรุณารอสักครู่', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
                    const uploadRes = await saveToServer('upload_image', { base64Data: window.packImageData.base64, fileName: window.packImageData.name });
                    imageUrl = (uploadRes && uploadRes.imageUrl) ? uploadRes.imageUrl : null;
                }
                executeTankUpdate(packPendingTankId, 'pack', { skipped: packPendingSkippedStep, imageUrl });
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'อัปโหลดภาพล้มเหลว', text: err.message, confirmButtonColor: '#ef4444' });
            }
        };

        // ===================== DISPATCH MODAL LOGIC =====================
        let dispatchPendingTankId = null;
        let dispatchPendingSkippedStep = null;
        window.dispatchFiles = []; // Array of { type:'image'|'pdf', base64, name, mimeType }

        window.openDispatchModal = (tankId, skippedStep, isEditingStep = false) => {
            dispatchPendingTankId = tankId;
            dispatchPendingSkippedStep = skippedStep;
            window.pendingIsEditingStep = isEditingStep;
            document.getElementById('dispatch-modal-tank-id').innerText = tankId;
            
            let defaultRefNo = '';
            if (isEditingStep) {
                const existingTank = window.globalTanks.find(t => t.id === tankId);
                if (existingTank && existingTank.history && existingTank.history.length > 0) {
                    const lastEntry = existingTank.history[existingTank.history.length - 1];
                    if (lastEntry && lastEntry.refNo) defaultRefNo = lastEntry.refNo;
                }
            }
            document.getElementById('dispatch-ref-no').value = defaultRefNo;

            const warning = document.getElementById('dispatch-modal-skip-warning');
            if (isEditingStep) {
                warning.classList.remove('hidden');
                warning.innerHTML = `✏️ <b>แก้ไขข้อมูลสเต็ปเดิม (จ่ายออก)</b> — เป็นการบันทึกซ้ำภายใน 24 ชม.`;
            } else if (skippedStep) {
                warning.classList.remove('hidden');
                warning.innerHTML = `⚠️ ข้ามขั้นตอน "${skippedStep}"`;
            } else {
                warning.classList.add('hidden');
            }
            clearDispatchFiles();
            document.getElementById('dispatch-modal').classList.remove('hidden');
        };

        window.closeDispatchModal = () => {
            document.getElementById('dispatch-modal').classList.add('hidden');
            clearDispatchFiles();
            document.getElementById('manual-tank-id').value = '';
            if (document.getElementById('view-scan').classList.contains('active')) startScanner();
        };

        window.clearDispatchFiles = () => {
            window.dispatchFiles = [];
            document.getElementById('dispatch-image-input').value = '';
            document.getElementById('dispatch-pdf-input').value = '';
            renderDispatchPreviews();
            updateDispatchSubmitBtn();
        };

        window.handleDispatchFileAdd = (event, type) => {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';

            if (type === 'pdf') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    window.dispatchFiles = [{ type: 'pdf', base64: e.target.result, name: `dispatch_${dispatchPendingTankId}_${file.name}`, mimeType: 'application/pdf' }];
                    renderDispatchPreviews();
                    updateDispatchSubmitBtn();
                };
                reader.readAsDataURL(file);
            } else {
                const imageFiles = window.dispatchFiles.filter(f => f.type === 'image');
                if (imageFiles.length >= 6) {
                    Swal.fire({ icon: 'warning', title: 'ครบ 6 ภาพแล้ว', text: 'ไม่สามารถเพิ่มรูปภาพได้อีก', timer: 1500, showConfirmButton: false });
                    return;
                }
                if (window.dispatchFiles.some(f => f.type === 'pdf')) {
                    Swal.fire({ icon: 'warning', title: 'มี PDF อยู่แล้ว', text: 'กรุณาลบ PDF ก่อนเพิ่มรูปภาพ', confirmButtonColor: '#2563eb' });
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    window.dispatchFiles.push({ type: 'image', base64: e.target.result, name: `dispatch_${dispatchPendingTankId}_${Date.now()}.jpg`, mimeType: 'image/jpeg' });
                    renderDispatchPreviews();
                    updateDispatchSubmitBtn();
                };
                reader.readAsDataURL(file);
            }
        };

        function renderDispatchPreviews() {
            const container = document.getElementById('dispatch-files-preview');
            const countEl = document.getElementById('dispatch-file-count');
            const imageFiles = window.dispatchFiles.filter(f => f.type === 'image');
            countEl.innerText = `${imageFiles.length} / 6`;

            container.innerHTML = window.dispatchFiles.map((f, idx) => {
                if (f.type === 'pdf') {
                    return `<div class="relative col-span-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                        <i class="fa-solid fa-file-pdf text-orange-500 text-2xl"></i>
                        <span class="text-xs font-bold text-orange-700 truncate flex-1">${f.name}</span>
                        <button onclick="removeDispatchFile(${idx})" class="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 bg-red-50 rounded-lg"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
                } else {
                    return `<div class="relative">
                        <img src="${f.base64}" class="w-full h-20 object-cover rounded-xl border border-gray-200">
                        <button onclick="removeDispatchFile(${idx})" class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold hover:bg-red-700"><i class="fa-solid fa-xmark"></i></button>
                    </div>`;
                }
            }).join('');

            const hasPdf = window.dispatchFiles.some(f => f.type === 'pdf');
            const hasImages = window.dispatchFiles.some(f => f.type === 'image');
            const imgBtn = document.getElementById('dispatch-add-image-btn');
            const pdfBtn = document.getElementById('dispatch-add-pdf-btn');
            if (imgBtn) imgBtn.style.display = hasPdf ? 'none' : '';
            if (pdfBtn) pdfBtn.style.display = hasImages || imageFiles.length >= 6 ? 'none' : '';
        }

        window.removeDispatchFile = (idx) => {
            window.dispatchFiles.splice(idx, 1);
            renderDispatchPreviews();
            updateDispatchSubmitBtn();
        };

        window.updateDispatchSubmitBtn = () => {
            const refNo = document.getElementById('dispatch-ref-no')?.value.trim();
            const hasFiles = window.dispatchFiles.length > 0;
            const isEditing = window.pendingIsEditingStep;
            const btn = document.getElementById('btn-submit-dispatch');
            if (!btn) return;
            if (refNo && (hasFiles || isEditing)) {
                btn.disabled = false;
                btn.className = 'flex-1 px-4 py-4 bg-purple-600 text-white rounded-xl font-bold shadow-md hover:bg-purple-700 transition-colors';
                btn.innerHTML = isEditing ? '<i class="fa-solid fa-check mr-1"></i> ยืนยันแก้ไขจ่ายออก' : '<i class="fa-solid fa-check mr-1"></i> ยืนยันจ่ายออก';
            } else {
                btn.disabled = true;
                btn.className = 'flex-1 px-4 py-4 bg-gray-300 text-gray-500 rounded-xl font-bold transition-colors cursor-not-allowed';
                btn.innerHTML = '<i class="fa-solid fa-lock text-xs mr-1"></i> ยืนยัน';
            }
        };

        window.submitDispatchModal = async () => {
            const refNo = document.getElementById('dispatch-ref-no').value.trim();
            const isEditing = window.pendingIsEditingStep;
            if (!refNo || (!isEditing && window.dispatchFiles.length === 0)) return;
            document.getElementById('dispatch-modal').classList.add('hidden');
            try {
                let imageUrl = null;
                if (window.dispatchFiles.length > 0) {
                    Swal.fire({ title: 'กำลังอัปโหลดไฟล์...', text: 'กรุณารอสักครู่', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
                    const uploadedUrls = [];
                    for (const f of window.dispatchFiles) {
                        const uploadRes = await saveToServer('upload_image', { base64Data: f.base64, fileName: f.name });
                        if (uploadRes && uploadRes.imageUrl) uploadedUrls.push(uploadRes.imageUrl);
                    }
                    imageUrl = uploadedUrls.length > 0 ? uploadedUrls.join(',') : null;
                }
                executeTankUpdate(dispatchPendingTankId, 'dispatch', { skipped: dispatchPendingSkippedStep, refNo, imageUrl });
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'อัปโหลดไฟล์ล้มเหลว', text: err.message, confirmButtonColor: '#ef4444' });
            }
        };

        window.executeTankUpdate = async (tankId, actionType, conditions = null) => {
            try {
                const isEditing = window.pendingIsEditingStep || false;
                window.pendingIsEditingStep = false;

                let newStatus = '', actionText = '', finalNote = '';
                
                if (actionType === 'receive') {
                    if (conditions?.isBad) { newStatus = 'Inactive'; actionText = 'รับเข้า (ชำรุด/ไม่พร้อม)'; finalNote = conditions.note; }
                    else { newStatus = 'Ready to Use'; actionText = 'รับเข้า (พร้อมใช้)'; finalNote = conditions?.note || ''; }
                } else if (actionType === 'pack') { 
                    newStatus = 'Stock'; actionText = 'บรรจุ'; 
                    if (conditions?.skipped) finalNote = `[ข้ามขั้นตอน: ${conditions.skipped}]`;
                } else if (actionType === 'dispatch') { 
                    newStatus = 'Customer'; actionText = 'จ่ายออก'; 
                    if (conditions?.skipped) finalNote = `[ข้ามขั้นตอน: ${conditions.skipped}]`;
                }

                Swal.fire({
                    title: isEditing ? 'กำลังอัปเดตการแก้ไขข้อมูล...' : 'กำลังบันทึกข้อมูล...',
                    text: 'กรุณารอสักครู่',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const now = Date.now();
                let tankData = window.globalTanks.find(t => t.id === tankId) || null;
                let history = tankData ? (tankData.history || []) : [];
                let cycleCount = tankData ? (tankData.cycleCount || 0) : 0;
                let customThresholds = tankData ? tankData.customThresholds : null;

                if (actionType === 'receive' && tankData && tankData.status === 'Customer' && !isEditing) {
                    cycleCount += 1;
                    let cycleText = `[จบรอบที่ ${cycleCount}]`;
                    finalNote = finalNote ? `${cycleText} ${finalNote}` : cycleText;
                }

                if (isEditing && history.length > 0) {
                    const lastEntry = history[history.length - 1];
                    const prevNote = lastEntry.note || '';
                    const cycleMatch = prevNote.match(/^(\[จบรอบที่ \d+\])/);
                    if (cycleMatch) {
                        if (!finalNote.startsWith(cycleMatch[1])) {
                            finalNote = `${cycleMatch[1]} ${finalNote}`;
                        }
                    }
                }

                const historyEntry = { date: now, action: actionText, user: window.appUser, note: finalNote };
                if (conditions?.imageUrl) {
                    historyEntry.imageUrl = conditions.imageUrl;
                }
                if (conditions?.refNo) {
                    historyEntry.refNo = conditions.refNo;
                }

                if (isEditing && history.length > 0) {
                    const lastIdx = history.length - 1;
                    if (!historyEntry.imageUrl && history[lastIdx].imageUrl) {
                        historyEntry.imageUrl = history[lastIdx].imageUrl;
                    }
                    if (!historyEntry.refNo && history[lastIdx].refNo) {
                        historyEntry.refNo = history[lastIdx].refNo;
                    }
                    history[lastIdx] = historyEntry;
                } else {
                    history.push(historyEntry);
                }

                const updatedTank = {
                    status: newStatus,
                    updatedAt: now,
                    note: finalNote,
                    history: history,
                    cycleCount: cycleCount
                };
                if (customThresholds) {
                    updatedTank.customThresholds = customThresholds;
                }

                await saveToServer("save_tanks", { [tankId]: updatedTank });
                await window.fetchDatabase(true);

                document.getElementById('manual-tank-id').value = '';

                const successTitle = isEditing ? 'แก้ไขข้อมูลสำเร็จ!' : 'บันทึกสำเร็จ!';
                const successMsg = isEditing ? `อัปเดตข้อมูลสเต็ปของถัง ${tankId} เป็นสถานะ: ${newStatus}` : `อัปเดตถัง ${tankId} เป็นสถานะ: ${newStatus}`;

                Swal.fire({ icon: 'success', title: successTitle, text: successMsg, timer: 1500, showConfirmButton: false })
                    .then(() => { if (document.getElementById('view-scan').classList.contains('active')) startScanner(); });

            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'บันทึกล้มเหลว', text: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' });
            }
        };

        // --- Navigation ---
        window.switchTab = (id) => {
            if (id !== 'history') {
                window.previousTab = id;
            }
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`view-${id}`).classList.add('active');
            
            document.querySelectorAll('.nav-btn-mobile').forEach(btn => btn.classList.replace('text-blue-600', 'text-gray-400'));
            const mobBtn = document.getElementById(`nav-mobile-${id}`);
            if(mobBtn) mobBtn.classList.replace('text-gray-400', 'text-blue-600');
            
            document.querySelectorAll('.nav-btn-desktop').forEach(btn => {
                btn.classList.remove('bg-blue-50', 'text-blue-600');
                btn.classList.add('text-gray-500', 'hover:bg-gray-50');
            });
            const deskBtn = document.getElementById(`nav-desktop-${id}`);
            if(deskBtn) {
                deskBtn.classList.remove('text-gray-500', 'hover:bg-gray-50');
                deskBtn.classList.add('bg-blue-50', 'text-blue-600');
            }
            
            if (id === 'scan') startScanner();
            else stopScanner();

            if (id === 'dashboard') renderDashboard();
            if (id === 'stock') renderStockTable();
            if (id === 'manage') renderManageTable();
            if (id === 'search') renderSearchTable();
            if (id === 'label') renderLabelPreview();
        };

        window.setScanAction = (action) => {
            document.getElementById('current-action').value = action;
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.replace('border-blue-500', 'border-transparent');
                btn.classList.replace('text-blue-800', 'text-gray-500');
                btn.classList.replace('bg-blue-100', 'bg-gray-50');
            });
            const active = document.getElementById(`btn-action-${action}`);
            if(active) {
                active.classList.replace('border-transparent', 'border-blue-500');
                active.classList.replace('text-gray-500', 'text-blue-800');
                active.classList.replace('bg-gray-50', 'bg-blue-100');
            }
        };

        window.closeConditionModal = () => {
            document.getElementById('condition-modal').classList.add('hidden');
            if (document.getElementById('view-scan').classList.contains('active')) startScanner();
        };

        window.selectedConditionImages = {
            general: { base64: null, name: null },
            valve: { base64: null, name: null },
            struct: { base64: null, name: null },
            base: { base64: null, name: null },
            ready: { base64: null, name: null }
        };

        window.toggleConditionImageField = () => {
            const v = document.querySelector('input[name="cond-valve"]:checked')?.value;
            const s = document.querySelector('input[name="cond-struct"]:checked')?.value;
            const b = document.querySelector('input[name="cond-base"]:checked')?.value;
            const r = document.querySelector('input[name="cond-ready"]:checked')?.value;
            
            const isValveNotPerfect = (v !== 'ดี');
            const isStructNotPerfect = (s !== 'ดี');
            const isBaseNotPerfect = (b !== 'ดี');
            const isReadyNotPerfect = (r !== 'พร้อมนำไปบรรจุ');
            
            const isAnyNotPerfect = (isValveNotPerfect || isStructNotPerfect || isBaseNotPerfect || isReadyNotPerfect);
            
            if (isAnyNotPerfect) {
                // Hide general and clear its input
                const genEl = document.getElementById('cond-image-general-container');
                if (genEl) genEl.classList.add('hidden');
                window.clearConditionImage('general');
                
                // Toggle specific ones
                toggleSection('valve', isValveNotPerfect);
                toggleSection('struct', isStructNotPerfect);
                toggleSection('base', isBaseNotPerfect);
                toggleSection('ready', isReadyNotPerfect);
            } else {
                // Show general
                const genEl = document.getElementById('cond-image-general-container');
                if (genEl) genEl.classList.remove('hidden');
                
                // Hide and clear all specific ones
                ['valve', 'struct', 'base', 'ready'].forEach(type => {
                    toggleSection(type, false);
                });
            }
        };

        function toggleSection(type, show) {
            const el = document.getElementById(`cond-image-${type}-container`);
            if (el) {
                if (show) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                    window.clearConditionImage(type);
                }
            }
        }

        window.openImageViewer = (imageUrl) => {
            const viewerModal = document.getElementById('image-viewer-modal');
            const viewerImg = document.getElementById('viewer-modal-img');
            const downloadBtn = document.getElementById('btn-download-viewer-img');
            
            viewerImg.src = imageUrl;
            
            // Extract Drive ID if it's a drive URL
            let downloadUrl = imageUrl;
            const matchD = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchD) {
                const id = matchD[1];
                downloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
            }
            
            downloadBtn.href = downloadUrl;
            downloadBtn.download = `tank_image_${Date.now()}.jpg`;
            
            viewerModal.classList.remove('hidden');
        };

        window.closeImageViewerModal = () => {
            document.getElementById('image-viewer-modal').classList.add('hidden');
        };

        window.handleConditionImageSelect = (event, type) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                window.selectedConditionImages[type] = {
                    base64: e.target.result,
                    name: `tank_${pendingTankId}_${type}_${Date.now()}.jpg`
                };
                
                document.getElementById(`cond-image-${type}-label`).innerText = file.name;
                document.getElementById(`cond-image-${type}-preview`).src = e.target.result;
                document.getElementById(`cond-image-${type}-preview-container`).classList.remove('hidden');
                document.getElementById(`btn-clear-cond-image-${type}`).classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        };

        window.clearConditionImage = (type) => {
            if (window.selectedConditionImages) {
                window.selectedConditionImages[type] = { base64: null, name: null };
            }
            
            const fileInput = document.getElementById(`cond-image-${type}`);
            if (fileInput) fileInput.value = '';
            
            const defaultLabels = {
                general: 'เลือกรูปภาพ',
                valve: 'เลือกรูปภาพวาล์วรั่ว',
                struct: 'เลือกรูปภาพโครงสร้างสนิม',
                base: 'เลือกรูปภาพฐานชำรุด',
                ready: 'เลือกรูปภาพไม่พร้อมใช้'
            };
            
            const labelEl = document.getElementById(`cond-image-${type}-label`);
            if (labelEl) labelEl.innerText = defaultLabels[type] || 'เลือกรูปภาพ';
            
            const previewEl = document.getElementById(`cond-image-${type}-preview`);
            if (previewEl) previewEl.src = '';
            
            const previewCont = document.getElementById(`cond-image-${type}-preview-container`);
            if (previewCont) previewCont.classList.add('hidden');
            
            const clearBtn = document.getElementById(`btn-clear-cond-image-${type}`);
            if (clearBtn) clearBtn.classList.add('hidden');
        };

        window.clearAllConditionImages = () => {
            ['general', 'valve', 'struct', 'base', 'ready'].forEach(type => {
                window.clearConditionImage(type);
            });
        };

        window.submitTankCondition = () => {
            const v = document.querySelector('input[name="cond-valve"]:checked')?.value;
            const s = document.querySelector('input[name="cond-struct"]:checked')?.value;
            const b = document.querySelector('input[name="cond-base"]:checked')?.value;
            const r = document.querySelector('input[name="cond-ready"]:checked')?.value;
            const n = document.getElementById('cond-note').value;

            // Guard: radio values must be set
            if (!v || !s || !b || !r) {
                Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกสภาพถังทุกหัวข้อให้ครบ', confirmButtonColor: '#2563eb' });
                return;
            }
            
            const bad = (r === 'ไม่พร้อมนำไปบรรจุ');

            const isValveNotPerfect = (v !== 'ดี');
            const isStructNotPerfect = (s !== 'ดี');
            const isBaseNotPerfect = (b !== 'ดี');
            const isReadyNotPerfect = (r !== 'พร้อมนำไปบรรจุ');
            const isAnyNotPerfect = (isValveNotPerfect || isStructNotPerfect || isBaseNotPerfect || isReadyNotPerfect);

            const imgs = window.selectedConditionImages || {};

            if (!isAnyNotPerfect) {
                // ทุกอย่างดี → บังคับรูปทั่วไป
                if (!imgs.general?.base64) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'กรุณาแนบรูปภาพ',
                        text: 'กรุณาแนบรูปถ่ายสภาพถังทั่วไปก่อนบันทึกข้อมูล',
                        confirmButtonColor: '#2563eb'
                    });
                    return;
                }
            } else {
                // มีสภาพผิดปกติ → บังคับรูปเฉพาะส่วน
                const missingPhotos = [];
                if (isValveNotPerfect && !imgs.valve?.base64)  missingPhotos.push('รูปถ่ายสภาพวาล์วที่รั่วซึม');
                if (isStructNotPerfect && !imgs.struct?.base64) missingPhotos.push('รูปถ่ายสภาพโครงสร้างที่เป็นสนิม');
                if (isBaseNotPerfect && !imgs.base?.base64)    missingPhotos.push('รูปถ่ายสภาพฐานที่ชำรุด');
                if (isReadyNotPerfect && !imgs.ready?.base64)  missingPhotos.push('รูปถ่ายสภาพไม่พร้อมนำไปบรรจุ');

                if (missingPhotos.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'กรุณาแนบรูปภาพ',
                        html: `กรุณาแนบ:<br><b>${missingPhotos.join('<br>')}</b><br>ก่อนบันทึกข้อมูล`,
                        confirmButtonColor: '#2563eb'
                    });
                    return;
                }
            }
            
            let noteStr = `[วาล์ว:${v}, โครง:${s}, ฐาน:${b}, สถานะ:${r}] ${n}`;
            if (window.pendingSkippedStep) {
                noteStr = `[ข้ามขั้นตอน: ${window.pendingSkippedStep}] ` + noteStr;
            }
            
            Swal.fire({
                title: 'ยืนยันการบันทึกข้อมูล?',
                text: "โปรดตรวจสอบความถูกต้องของข้อมูลสภาพถังก่อนบันทึก",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: 'บันทึกข้อมูล',
                cancelButtonText: 'ยกเลิก'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    let uploadedUrls = [];
                    
                    // Find all active uploads
                    const activeUploads = [];
                    ['general', 'valve', 'struct', 'base', 'ready'].forEach(type => {
                        const img = window.selectedConditionImages[type];
                        if (img && img.base64) {
                            activeUploads.push({ type, img });
                        }
                    });
                    
                    if (activeUploads.length > 0) {
                        try {
                            Swal.fire({
                                title: 'กำลังอัปโหลดรูปภาพ...',
                                text: 'กรุณารอสักครู่',
                                allowOutsideClick: false,
                                showConfirmButton: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });
                            
                            for (let upload of activeUploads) {
                                const uploadRes = await saveToServer('upload_image', {
                                    base64Data: upload.img.base64,
                                    fileName: upload.img.name
                                });
                                
                                if (uploadRes && uploadRes.imageUrl) {
                                    uploadedUrls.push(uploadRes.imageUrl);
                                }
                            }
                        } catch (err) {
                            console.error("Images upload failed:", err);
                            Swal.fire({
                                icon: 'error',
                                title: 'อัปโหลดรูปภาพล้มเหลว',
                                text: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
                                confirmButtonColor: '#ef4444'
                            });
                            return; // Stop execution
                        }
                    }

                    const imageUrlsStr = uploadedUrls.length > 0 ? uploadedUrls.join(',') : null;

                    executeTankUpdate(pendingTankId, 'receive', { 
                        isBad: bad, 
                        note: noteStr,
                        imageUrl: imageUrlsStr
                    });
                    document.getElementById('condition-modal').classList.add('hidden');
                }
            });
        };

        window.handleManualSubmit = () => {
            const val = document.getElementById('manual-tank-id').value.trim().toUpperCase();
            if(val) { 
                processScannedTank(val); 
            } else {
                Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: 'กรุณากรอกรหัสถังก่อนกดยืนยัน', confirmButtonColor: '#2563eb' });
            }
        };

        // --- RENDER SEARCH/HISTORY TABLE ---
        window.renderSearchTable = () => {
            const tbody = document.getElementById('search-table-body');
            const emptyState = document.getElementById('search-empty-state');
            const emptyText = document.getElementById('search-empty-text');
            const countBadge = document.getElementById('search-count-badge');
            const paginationContainer = document.getElementById('search-pagination-container');
            
            if (!window.globalTanks || window.globalTanks.length === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ยังไม่มีข้อมูลถังในระบบ';
                countBadge.innerText = 'จำนวนทั้งหมด: 0 ใบ';
                paginationContainer.style.display = 'none';
                return;
            }

            const searchQuery = document.getElementById('search-history-input').value.toUpperCase().trim();
            const statusFilter = document.getElementById('filter-history-status').value;

            const filtered = window.globalTanks.filter(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                if (searchQuery && !tank.id.includes(searchQuery)) return false;
                if (statusFilter === 'all') return true;
                if (statusFilter === 'loss') return !!lossReason || tank.status === 'Loss';
                if (lossReason || tank.status === 'Loss') return false; 
                if (statusFilter === 'ready' && tank.status === 'Ready to Use') return true;
                if (statusFilter === 'stock' && tank.status === 'Stock') return true;
                if (statusFilter === 'customer' && tank.status === 'Customer') return true;
                if (statusFilter === 'inactive' && tank.status === 'Inactive') return true;

                return false;
            });

            const totalItems = filtered.length;
            countBadge.innerText = `จำนวนทั้งหมด: ${totalItems} ใบ`;

            if (totalItems === 0) {
                tbody.innerHTML = '';
                emptyState.classList.remove('hidden');
                emptyText.innerText = 'ไม่พบข้อมูลตามเงื่อนไขที่ระบุ';
                paginationContainer.style.display = 'none';
                return;
            }

            emptyState.classList.add('hidden');
            paginationContainer.style.display = 'flex';
            
            filtered.sort((a, b) => b.updatedAt - a.updatedAt);

            // Pagination logic
            const totalPages = Math.ceil(totalItems / searchPageSize) || 1;
            if (window.searchCurrentPage > totalPages) window.searchCurrentPage = totalPages;
            if (window.searchCurrentPage < 1) window.searchCurrentPage = 1;

            document.getElementById('search-page-num').innerText = window.searchCurrentPage;
            document.getElementById('search-page-total').innerText = totalPages;

            document.getElementById('btn-search-prev').disabled = (window.searchCurrentPage === 1);
            document.getElementById('btn-search-next').disabled = (window.searchCurrentPage === totalPages);

            const startIndex = (window.searchCurrentPage - 1) * searchPageSize;
            const endIndex = startIndex + searchPageSize;
            const paginatedItems = filtered.slice(startIndex, endIndex);

            tbody.innerHTML = paginatedItems.map(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);
                
                let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                let statusText = tank.status;
                let dayColor = 'text-gray-600';
                
                if (lossReason || tank.status === 'Loss') {
                    badgeClass = 'bg-red-50 text-red-700 border-red-200';
                    statusText = 'คาดการณ์สูญหาย';
                    dayColor = 'text-red-600';
                } else if (tank.status === 'Ready to Use') {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    statusText = 'ถังเปล่าพร้อมใช้';
                } else if (tank.status === 'Stock') {
                    badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                    statusText = 'บรรจุแล้วรอขาย';
                } else if (tank.status === 'Customer') {
                    badgeClass = 'bg-green-50 text-green-700 border-green-200';
                    statusText = 'ขายแล้วรอกลับ';
                } else if (tank.status === 'Inactive') {
                    badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
                    statusText = 'ถังไม่พร้อมใช้งาน';
                }

                return `
                    <tr class="hover:bg-gray-50/80 transition-colors">
                        <td class="p-4 font-black text-gray-800 whitespace-nowrap text-sm">
                            ${tank.id}
                            <div class="mt-1 flex flex-col items-start gap-1">
                                <span class="text-[9px] text-purple-600 font-bold border border-purple-200 bg-purple-50 px-1.5 py-0.5 rounded flex items-center w-max"><i class="fa-solid fa-arrows-spin mr-1"></i> รอบใช้งาน: ${tank.cycleCount || 0}</span>
                            </div>
                        </td>
                        <td class="p-4 whitespace-nowrap">
                            <span class="${badgeClass} border px-2.5 py-1 rounded-lg text-[10px] font-bold">${statusText}</span>
                            ${lossReason ? `<div class="text-[9px] text-red-500 mt-1 font-semibold leading-tight"><i class="fa-solid fa-circle-exclamation mr-1"></i>${lossReason}</div>` : ''}
                        </td>
                        <td class="p-4 text-[10px] text-gray-500 whitespace-nowrap">
                            <div class="font-bold text-gray-700">${new Date(tank.updatedAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })}</div>
                            <div>${new Date(tank.updatedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                        </td>
                        <td class="p-4 text-sm font-black ${dayColor} whitespace-nowrap text-center">
                            ${days} <span class="text-[10px] font-normal text-gray-400">วัน</span>
                        </td>
                        <td class="p-4 whitespace-nowrap text-center">
                            <button onclick="viewTankHistory('${tank.id}')" class="bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-gray-200 shadow-sm">
                                <i class="fa-solid fa-list mr-1"></i> ดูประวัติ
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        // --- HISTORY PAGE & PAGINATION LOGIC ---
        window.viewTankHistory = (tankId) => {
            window.currentHistoryTankId = tankId;
            window.historyCurrentPage = 1;
            renderHistoryView();
            switchTab('history');
        };

        window.changeHistoryPage = (dir) => {
            window.historyCurrentPage += dir;
            renderHistoryView();
        };

        window.renderHistoryView = () => {
            const tankId = window.currentHistoryTankId;
            const tank = window.globalTanks.find(t => t.id === tankId);
            if (!tank) return;

            // Render Header
            const sortedHistory = (tank.history || []).slice().sort((a, b) => b.date - a.date);
            const actionCounts = sortedHistory.reduce((acc, curr) => {
                const baseAction = curr.action.split(' ')[0];
                acc[baseAction] = (acc[baseAction] || 0) + 1;
                return acc;
            }, {});
            
            const countsHtml = Object.entries(actionCounts).map(([action, count]) => 
                `<span class="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-100 mr-2 mb-2 inline-block">${action}: ${count}</span>`
            ).join('');

            document.getElementById('history-page-header').innerHTML = `
                <span class="font-black text-gray-800 text-2xl block mb-3">${tank.id}</span>
                <div class="flex items-center flex-wrap gap-2 mb-3">
                    <span class="text-xs font-bold px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 inline-block">
                        <i class="fa-solid fa-arrows-spin mr-1"></i> ใช้งานไปแล้ว: ${tank.cycleCount || 0} รอบ
                    </span>
                    <span class="text-xs font-bold px-3 py-1.5 bg-gray-100 rounded-lg text-gray-600 border border-gray-200 inline-block">
                        สถานะล่าสุด: <span class="text-blue-600">${tank.status}</span>
                    </span>
                </div>
                <div class="flex flex-wrap mb-3">${countsHtml}</div>
            `;

            document.getElementById('history-total-count').innerText = sortedHistory.length;

            // Pagination logic
            const totalItems = sortedHistory.length;
            const totalPages = Math.ceil(totalItems / historyPageSize) || 1;
            if (window.historyCurrentPage > totalPages) window.historyCurrentPage = totalPages;
            if (window.historyCurrentPage < 1) window.historyCurrentPage = 1;

            document.getElementById('history-page-num').innerText = window.historyCurrentPage;
            document.getElementById('history-page-total').innerText = totalPages;

            document.getElementById('btn-history-prev').disabled = (window.historyCurrentPage === 1);
            document.getElementById('btn-history-next').disabled = (window.historyCurrentPage === totalPages);

            const paginationContainer = document.getElementById('history-pagination-container');
            if (totalItems <= historyPageSize) {
                paginationContainer.style.display = 'none';
            } else {
                paginationContainer.style.display = 'flex';
            }

            const startIndex = (window.historyCurrentPage - 1) * historyPageSize;
            const endIndex = startIndex + historyPageSize;
            const paginatedItems = sortedHistory.slice(startIndex, endIndex);

            let historyHtml = '<div class="text-center py-6 text-gray-400 text-sm font-bold">ไม่มีข้อมูลประวัติ</div>';
            if (paginatedItems.length > 0) {
                historyHtml = paginatedItems.map((h, idx) => {
                    const isFirstOnOverallList = (startIndex + idx) === 0;
                    return `
                        <div class="flex justify-between items-start border-b border-gray-200 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0 relative">
                            ${isFirstOnOverallList ? '<div class="absolute -left-4 top-1.5 w-1.5 h-[calc(100%-12px)] bg-blue-500 rounded-full"></div><div class="pl-1">' : '<div>'}
                                <div class="font-bold ${isFirstOnOverallList ? 'text-blue-700' : 'text-gray-700'} text-xs">
                                    ${h.action} 
                                    ${isFirstOnOverallList ? '<span class="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded ml-1">ล่าสุด</span>' : ''}
                                </div>
                                ${h.note ? `<div class="text-[10px] text-gray-500 italic mt-1 leading-snug">${h.note}</div>` : ''}
                                ${h.refNo ? `<div class="text-[10px] text-blue-600 font-bold mt-1 leading-snug"><i class="fa-solid fa-receipt mr-1"></i>เลขที่อ้างอิง: ${h.refNo}</div>` : ''}
                                ${h.imageUrl ? h.imageUrl.split(',').map(url => {
                                    const trimmed = url.trim();
                                    const isPdf = trimmed.includes('drive.google.com/file/');
                                    if (isPdf) {
                                        // Build download URL from view URL: .../file/d/{id}/view -> uc?export=download&id={id}
                                        const pdfIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                        const downloadUrl = pdfIdMatch ? `https://drive.google.com/uc?export=download&id=${pdfIdMatch[1]}` : trimmed;
                                        return `<div class="mt-2 mb-1 w-full">
                                            <div class="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                                                <i class="fa-solid fa-file-pdf text-orange-500 text-2xl flex-shrink-0"></i>
                                                <div class="flex-1 min-w-0">
                                                    <div class="text-xs font-bold text-orange-800">ไฟล์ PDF แนบ</div>
                                                </div>
                                                <div class="flex gap-2 flex-shrink-0">
                                                    <a href="${trimmed}" target="_blank" class="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg text-[10px] font-bold hover:bg-orange-600 transition-colors flex items-center gap-1">
                                                        <i class="fa-solid fa-eye"></i> ดู
                                                    </a>
                                                    <a href="${downloadUrl}" target="_blank" class="px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition-colors flex items-center gap-1">
                                                        <i class="fa-solid fa-download"></i> โหลด
                                                    </a>
                                                </div>
                                            </div>
                                        </div>`;
                                    }
                                    return `<div class="mt-2 mb-1 inline-block mr-2">
                                        <img src="${trimmed}" class="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onclick="openImageViewer('${trimmed}')">
                                    </div>`;
                                }).join('') : ''}
                                <div class="text-[9px] text-gray-400 mt-1">โดย: <span class="font-bold">${h.user}</span></div>
                            ${isFirstOnOverallList ? '</div>' : '</div>'}
                            <div class="text-right shrink-0 ml-2">
                                <div class="text-[10px] font-bold text-gray-600">${new Date(h.date).toLocaleDateString('th-TH', {year: '2-digit', month: 'short', day: 'numeric'})}</div>
                                <div class="text-[9px] text-gray-400">${new Date(h.date).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})} น.</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            document.getElementById('history-timeline-list').innerHTML = historyHtml;
        };

        // --- DELETE ALL HISTORY LOGIC ---
        window.confirmDeleteAllHistory = () => {
            if (window.appRole !== 'admin') {
                Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์', text: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลบข้อมูลทั้งหมดได้' });
                return;
            }
            if (!window.globalTanks || window.globalTanks.length === 0) {
                Swal.fire({ icon: 'info', title: 'ไม่มีข้อมูล', text: 'ระบบว่างเปล่า ไม่มีข้อมูลให้ลบ' });
                return;
            }

            Swal.fire({
                title: 'ยืนยันการล้างประวัติทั้งหมด?',
                text: '⚠️ ข้อมูลถังและประวัติทั้งหมดในระบบจะถูกลบทิ้งถาวร และไม่สามารถกู้คืนได้ พิมพ์คำว่า "CONFIRM" เพื่อยืนยัน',
                icon: 'warning',
                input: 'text',
                inputPlaceholder: 'พิมพ์ CONFIRM',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> ลบข้อมูลทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                preConfirm: (inputValue) => {
                    if (inputValue !== 'CONFIRM') {
                        Swal.showValidationMessage('กรุณาพิมพ์คำว่า CONFIRM ให้ถูกต้อง');
                    }
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        Swal.fire({ title: 'กำลังล้างข้อมูล...', text: 'อาจใช้เวลาสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
                        
                        await saveToServer("delete_all_with_files", {});
                        await window.fetchDatabase(true);

                        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ!', text: 'ข้อมูลถังทั้งหมดถูกล้างออกจากระบบแล้ว', timer: 2000, showConfirmButton: false });
                    } catch (error) {
                        console.error(error);
                        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลทั้งหมดได้', 'error');
                    }
                }
            });
        };

        // --- EXPORT TO EXCEL LOGIC ---
        window.exportToExcel = () => {
            if (!window.globalTanks || window.globalTanks.length === 0) {
                Swal.fire({ icon: 'warning', title: 'ไม่มีข้อมูล', text: 'ไม่พบข้อมูลสำหรับส่งออก', confirmButtonColor: '#2563eb' });
                return;
            }

            const searchQuery = document.getElementById('search-history-input').value.toUpperCase().trim();
            const statusFilter = document.getElementById('filter-history-status').value;

            const filtered = window.globalTanks.filter(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);

                if (searchQuery && !tank.id.includes(searchQuery)) return false;
                if (statusFilter === 'all') return true;
                if (statusFilter === 'loss') return !!lossReason || tank.status === 'Loss';
                if (lossReason || tank.status === 'Loss') return false; 
                if (statusFilter === 'ready' && tank.status === 'Ready to Use') return true;
                if (statusFilter === 'stock' && tank.status === 'Stock') return true;
                if (statusFilter === 'customer' && tank.status === 'Customer') return true;
                if (statusFilter === 'inactive' && tank.status === 'Inactive') return true;

                return false;
            });

            if (filtered.length === 0) {
                Swal.fire({ icon: 'warning', title: 'ไม่มีข้อมูล', text: 'ไม่พบข้อมูลตามเงื่อนไขที่ระบุ', confirmButtonColor: '#2563eb' });
                return;
            }

            const excelData = [];

            filtered.forEach(tank => {
                const days = calculateDays(tank.updatedAt);
                const lossReason = getExpectedLossInfo(tank.status, days, tank.customThresholds);
                
                let statusText = tank.status;
                if (lossReason || tank.status === 'Loss') statusText = 'คาดการณ์สูญหาย';
                else if (tank.status === 'Ready to Use') statusText = 'ถังเปล่าพร้อมใช้';
                else if (tank.status === 'Stock') statusText = 'บรรจุแล้วรอขาย';
                else if (tank.status === 'Customer') statusText = 'ขายแล้วรอกลับ';
                else if (tank.status === 'Inactive') statusText = 'ถังไม่พร้อมใช้งาน';

                const sortedHistory = (tank.history || []).slice().sort((a, b) => b.date - a.date);

                if (sortedHistory.length === 0) {
                    excelData.push({
                        'รหัสถัง': tank.id,
                        'สถานะปัจจุบันของถัง': statusText,
                        'รอบการใช้งาน': tank.cycleCount || 0,
                        'จำนวนวันคงค้าง': days,
                        'กระบวนการที่ทำ': '-',
                        'เลขที่อ้างอิง': '-',
                        'วันที่ทำรายการ': '-',
                        'เวลาที่ทำรายการ': '-',
                        'ผู้ทำรายการ': '-',
                        'บันทึกเพิ่มเติม': '-',
                        'หมายเหตุสถานะ': lossReason || '-'
                    });
                } else {
                    sortedHistory.forEach((h, index) => {
                        excelData.push({
                            'รหัสถัง': tank.id,
                            'สถานะปัจจุบันของถัง': statusText,
                            'รอบการใช้งาน': tank.cycleCount || 0,
                            'จำนวนวันคงค้าง': days,
                            'กระบวนการที่ทำ': h.action,
                            'เลขที่อ้างอิง': h.refNo || '-',
                            'วันที่ทำรายการ': new Date(h.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
                            'เวลาที่ทำรายการ': new Date(h.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
                            'ผู้ทำรายการ': h.user,
                            'บันทึกเพิ่มเติม': h.note || '-',
                            'หมายเหตุสถานะ': lossReason || '-'
                        });
                    });
                }
            });

            try {
                const worksheet = XLSX.utils.json_to_sheet(excelData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Tank Data");
                
                const dateStr = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(workbook, `PK_Tank_Report_${dateStr}.xlsx`);
                
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
            } catch (error) {
                console.error("Export error:", error);
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถสร้างไฟล์ Excel ได้', confirmButtonColor: '#2563eb' });
            }
        };