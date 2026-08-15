const API_URL = 'https://script.google.com/macros/s/AKfycbx2Y9ySye3CfrwPjr3WiVrYLAKwTj0YlSqiObr94h_L0SagMvxZ7sYTHVVk-jYUDyiLig/exec';
const FIREBASE_DB_URL = 'https://ltd-laundry-default-rtdb.asia-southeast1.firebasedatabase.app/.json';
        
        
window.formatDateTimeThai = function(dateStr) {
    if (!dateStr) return '-';
    let str = String(dateStr).trim();
    if (!str || str === '-') return '-';

    try {
        let parseStr = str;
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
            parseStr = str.replace(' ', 'T');
        }
        const d = new Date(parseStr);
        if (!isNaN(d.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            const day = pad(d.getDate());
            const month = pad(d.getMonth() + 1);
            const year = d.getFullYear();
            
            const hasTime = str.includes(':') || (str.includes('T') && str.split('T')[1]);
            if (hasTime) {
                const hours = pad(d.getHours());
                const minutes = pad(d.getMinutes());
                const seconds = pad(d.getSeconds());
                return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            } else {
                return `${day}/${month}/${year}`;
            }
        }
    } catch (e) {
        // ignore and fallback
    }

    str = str.replace('T', ' ').replace(/\.\d+Z$/, '').replace(/Z$/, '');
    const parts = str.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '';

    if (datePart.includes('-')) {
        const dSplit = datePart.split('-');
        if (dSplit.length === 3 && dSplit[0].length === 4) {
            const y = dSplit[0];
            const m = dSplit[1];
            const d = dSplit[2];
            return `${d}/${m}/${y}${timePart ? ' ' + timePart : ''}`.trim();
        }
    } else if (datePart.includes('/')) {
        const dSplit = datePart.split('/');
        if (dSplit.length === 3 && dSplit[0].length === 4) {
            const y = dSplit[0];
            const m = dSplit[1];
            const d = dSplit[2];
            return `${d}/${m}/${y}${timePart ? ' ' + timePart : ''}`.trim();
        }
    }
    return str;
};

let db = { products: [], machines: [], mappings: [], purchaseOrders: [] };
        let isShowCostInCatalog = false;
        let isShowPriceBForGuest = false;
        let isShowPriceCForGuest = false;
        let selectedMappingProducts = new Set();
        let currentSelectedMachineForMapping = '';
        let isMobileCartOpen = false;

        let catalogCategories = [];
        let catalogMachines = [];
        let currentCatalogMode = 'products'; // 'products' หรือ 'machines'

        let currentCatalogPage = 1;
        let currentMapProductPage = 1;
        const MAP_PRODUCT_LIMIT = 50;
        let reportCurrentPage = 1;
        let reportFilteredProducts = [];
        let reportProductUsageMap = new Map();

        // ===== Auth System =====
        let isLoggedIn = false;
        let currentUser = null; // { fullName, department, phone, email, role }
        
        const ROLE_PERMISSIONS = {
            'user': ['view-catalog', 'view-pos', 'view-transactions', 'view-settings', 'view-manual'],
            'Technician': ['view-catalog', 'view-pos', 'view-transactions', 'view-settings', 'view-manual'],
            'Manager': ['view-catalog', 'view-pos', 'view-transactions', 'view-add-product', 'view-edit-products', 'view-restock', 'view-report', 'view-restock-history', 'view-settings', 'view-manage-manuals', 'view-manual', 'view-user-management'],
            'ADMIN': ['view-catalog', 'view-pos', 'view-transactions', 'view-add-product', 'view-machines', 'view-mapping', 'view-edit-products', 'view-edit-mapping', 'view-restock', 'view-report', 'view-restock-history', 'view-settings', 'view-manage-manuals', 'view-manual', 'view-user-management', 'view-purchase'],
            'StoreOfficer': ['view-catalog', 'view-purchase', 'view-settings']
        };

        function hasAccess(viewId) {
            if (viewId === 'view-catalog') return true;
            if (viewId === 'view-manual') {
                if (isLoggedIn && currentUser && currentUser.role === 'StoreOfficer') return false;
                return true;
            }
            if (!isLoggedIn || !currentUser) return false;
            const allowedViews = ROLE_PERMISSIONS[currentUser.role] || [];
            return allowedViews.includes(viewId);
        }

        document.addEventListener('DOMContentLoaded', () => { 
            // 1. Inject sidebar
            injectSidebar();

            // 2. Load Auth Session
            const savedUser = sessionStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    isLoggedIn = true;
                } catch (e) {
                    currentUser = null;
                    isLoggedIn = false;
                }
            }

            // 3. Update Auth UI to adjust elements and sidebar visibility
            updateAuthUI(); 

            // 4. Check url parameters
            const urlParams = new URLSearchParams(window.location.search);
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            
            // Get intended view
            let initialView = urlParams.get('view');
            if (!initialView) {
                if (currentPage === 'requisition.html') initialView = 'view-pos';
                else if (currentPage === 'purchase.html') initialView = 'view-purchase';
                else initialView = 'view-catalog';
            }

            // If we are on index.html and triggerLogin is present, open login dialog
            const triggerLogin = urlParams.get('triggerLogin') === 'true';
            const redirectView = urlParams.get('redirectView');

            if (triggerLogin && !isLoggedIn) {
                showLoginDialog(() => {
                    if (redirectView) {
                        switchView(redirectView);
                    }
                });
            }

            // 5. Verify authorization
            const targetPage = VIEW_PAGES[initialView] || 'index.html';
            const isSamePage = currentPage === targetPage || (currentPage === '' && targetPage === 'index.html');
            
            const isPublicView = initialView === 'view-catalog' || initialView === 'view-manual';

            if (!isPublicView) {
                if (!isLoggedIn) {
                    // Redirect to login on index.html
                    window.location.href = `index.html?triggerLogin=true&redirectView=${initialView}`;
                    return;
                } else if (!hasAccess(initialView)) {
                    // Logged in but no permissions
                    showToast("คุณไม่มีสิทธิ์เข้าถึงส่วนงานนี้", "error");
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                    return;
                }
            }

            // 6. If authorized and on the correct page, render the view
            if (isSamePage) {
                document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
                const targetEl = document.getElementById(initialView);
                if (targetEl) {
                    targetEl.classList.remove('hidden');
                }
                updateSidebarHighlight(initialView);
                
                // Run page specific view initializations if needed
                if (initialView === 'view-restock' && typeof initRestockView === 'function') initRestockView();
                if (initialView === 'view-manual' && typeof initManualView === 'function') initManualView();
                if (initialView === 'view-manage-manuals' && typeof initManageManualsView === 'function') initManageManualsView();
                if (initialView === 'view-user-management' && typeof fetchAndRenderUsersList === 'function') fetchAndRenderUsersList();
                if (initialView === 'view-report' && typeof initReportView === 'function') initReportView();
                if (initialView === 'view-purchase') {
                    if (typeof closePurchaseSubSection === 'function') closePurchaseSubSection();
                    const isAdmin = currentUser && currentUser.role === 'ADMIN';
                    const cardManage = document.getElementById('card-manage-orders');
                    if (cardManage) cardManage.classList.toggle('hidden', !isAdmin);
                    const cardHistory = document.getElementById('card-purchase-history');
                    if (cardHistory) cardHistory.classList.toggle('hidden', !isAdmin);
                    const cardOverview = document.getElementById('card-purchase-overview');
                    if (cardOverview) cardOverview.classList.toggle('hidden', !isAdmin);
                }
            } else {
                // If the URL parameters point to a view belonging to another page, redirect to it!
                window.location.href = `${targetPage}?view=${initialView}`;
                return;
            }

            // 7. Fetch data
            fetchData(false); 
        });

        document.addEventListener('click', function(event) {
            const inputCat = document.getElementById('input_filterCategory');
            if (inputCat) {
                const catContainer = inputCat.parentElement.parentElement;
                if (!catContainer.contains(event.target)) {
                    document.getElementById('dropdown_filterCategory').classList.add('hidden');
                    const hiddenCat = document.getElementById('filterCategory');
                    if(hiddenCat.value === 'all') inputCat.value = '';
                    else if(catalogCategories.includes(hiddenCat.value)) inputCat.value = hiddenCat.value;
                }
            }
            
            const inputMach = document.getElementById('input_filterMachine');
            if (inputMach) {
                const machContainer = inputMach.parentElement.parentElement;
                if (!machContainer.contains(event.target)) {
                    document.getElementById('dropdown_filterMachine').classList.add('hidden');
                    const hiddenMach = document.getElementById('filterMachine');
                    if(hiddenMach.value === 'all') inputMach.value = '';
                    else {
                        const m = catalogMachines.find(x => x.id === hiddenMach.value);
                        if(m) inputMach.value = m.id + ' : ' + m.name;
                    }
                }
            }
            
            const inputPosCat = document.getElementById('input_posCategoryFilter');
            if (inputPosCat) {
                const posCatContainer = inputPosCat.parentElement.parentElement;
                if (!posCatContainer.contains(event.target)) {
                    document.getElementById('dropdown_posCategoryFilter').classList.add('hidden');
                    const hiddenPosCat = document.getElementById('posCategoryFilter');
                    if (hiddenPosCat.value === 'all') inputPosCat.value = '';
                    else inputPosCat.value = hiddenPosCat.value;
                }
            }
            
            const inputPosMach = document.getElementById('input_posMachineFilter');
            if (inputPosMach) {
                const posMachContainer = inputPosMach.parentElement.parentElement;
                if (!posMachContainer.contains(event.target)) {
                    document.getElementById('dropdown_posMachineFilter').classList.add('hidden');
                    const hiddenPosMach = document.getElementById('posMachineFilter');
                    if (hiddenPosMach.value === 'all') inputPosMach.value = '';
                    else {
                        const m = db.machines.find(x => String(x.id) === hiddenPosMach.value);
                        if (m) inputPosMach.value = m.name;
                    }
                }
            }
            
            const mapMachContainer = document.getElementById('map_machine_search');
            if (mapMachContainer && !mapMachContainer.parentElement.contains(event.target) && typeof hideMachineSuggestions === 'function') hideMachineSuggestions();
            
            const restockProductInput = document.getElementById('restock_product_input');
            if (restockProductInput) {
                const restockContainer = restockProductInput.parentElement.parentElement;
                if (!restockContainer.contains(event.target)) {
                    document.getElementById('dropdown_restock_product').classList.add('hidden');
                }
            }

            const reportCatContainer = document.getElementById('report_filter_cat_input');
            if (reportCatContainer && !reportCatContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_cat_dropdown').classList.add('hidden');
            }
            const reportMachContainer = document.getElementById('report_filter_mach_input');
            if (reportMachContainer && !reportMachContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_mach_dropdown').classList.add('hidden');
            }
            const reportReqContainer = document.getElementById('report_filter_req_input');
            if (reportReqContainer && !reportReqContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_req_dropdown').classList.add('hidden');
            }
            const reportDocContainer = document.getElementById('report_filter_doc_input');
            if (reportDocContainer && !reportDocContainer.parentElement.contains(event.target)) {
                document.getElementById('report_filter_doc_dropdown').classList.add('hidden');
            }
        });

        function escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function escapeForJS(str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function fNumber(val, fallbackCalc) {
            let num = parseFloat(val);
            // แก้บัค 3: เช็คเฉพาะ NaN หรือ null/undefined ไม่รวม 0 เพื่อให้ราคา 0 บาทแสดงได้ถูกต้อง
            if (isNaN(num) || val === '' || val === null || val === undefined) {
                num = parseFloat(fallbackCalc);
            }
            if (isNaN(num)) num = 0; 
            return num.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        // fNumberM: เหมือน fNumber แต่ treat ราคา 0 เป็น "ยังไม่ได้กำหนด" → fallback คำนวณจาก cost
        // ใช้กับหมวดหมู่เครื่องจักร เพื่อให้พฤติกรรมเหมือนหมวดหมู่อะไหล่
        function fNumberM(val, fallbackCalc) {
            let num = parseFloat(val);
            if (isNaN(num) || val === '' || val === null || val === undefined || num === 0) {
                num = parseFloat(fallbackCalc);
            }
            if (isNaN(num)) num = 0;
            return num.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        function autoCalcMachinePrices(prefix) {
            const cost = parseFloat(document.getElementById(`${prefix}_cost`).value) || 0;
            if (cost > 0) {
                document.getElementById(`${prefix}_price_a`).value = (cost * 2.1).toFixed(2);
                document.getElementById(`${prefix}_price_b`).value = (cost * 1.7).toFixed(2);
                document.getElementById(`${prefix}_price_c`).value = (cost * 1.3).toFixed(2);
            } else {
                document.getElementById(`${prefix}_price_a`).value = '';
                document.getElementById(`${prefix}_price_b`).value = '';
                document.getElementById(`${prefix}_price_c`).value = '';
            }
        }

        function autoCalcSparePartPrices(prefix) {
            const cost = parseFloat(document.getElementById(`${prefix}_cost`).value) || 0;
            if (cost > 0) {
                document.getElementById(`${prefix}_price_a`).value = (cost * 2.1).toFixed(2);
                document.getElementById(`${prefix}_price_b`).value = (cost * 1.7).toFixed(2);
                document.getElementById(`${prefix}_price_c`).value = (cost * 1.3).toFixed(2);
            } else {
                document.getElementById(`${prefix}_price_a`).value = '';
                document.getElementById(`${prefix}_price_b`).value = '';
                document.getElementById(`${prefix}_price_c`).value = '';
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                backdrop.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; 
            } else {
                sidebar.classList.add('-translate-x-full');
                backdrop.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        const VIEW_PAGES = {
            'view-catalog': 'index.html',
            'view-manual': 'index.html',
            'view-settings': 'index.html',
            'view-machines': 'index.html',
            'view-mapping': 'index.html',
            'view-edit-mapping': 'index.html',
            'view-add-product': 'index.html',
            'view-edit-products': 'index.html',
            'view-restock': 'index.html',
            'view-restock-history': 'index.html',
            'view-manage-manuals': 'index.html',
            'view-user-management': 'index.html',
            'view-report': 'index.html',
            
            'view-pos': 'requisition.html',
            'view-transactions': 'requisition.html',
            
            'view-purchase': 'purchase.html'
        };

        function switchView(viewId, element = null) {
            if (viewId === 'view-catalog' || viewId === 'view-manual') {
                // Public catalog and manuals always allowed
            } else if (!isLoggedIn) {
                showLoginDialog(() => switchView(viewId, element));
                return;
            } else if (!hasAccess(viewId)) {
                showToast("คุณไม่มีสิทธิ์เข้าถึงส่วนงานนี้", "error");
                return;
            }

            const targetPage = VIEW_PAGES[viewId] || 'index.html';
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const isSamePage = currentPage === targetPage || (currentPage === '' && targetPage === 'index.html');

            if (isSamePage) {
                // Same page SPA toggle
                document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
                const targetEl = document.getElementById(viewId);
                if (targetEl) {
                    targetEl.classList.remove('hidden');
                }

                // Initializers for views
                if (viewId === 'view-restock' && typeof initRestockView === 'function') {
                    initRestockView();
                }
                if (viewId === 'view-report' && typeof initReportView === 'function') {
                    initReportView();
                }
                if (viewId === 'view-manual' && typeof initManualView === 'function') {
                    initManualView();
                }
                if (viewId === 'view-manage-manuals' && typeof initManageManualsView === 'function') {
                    initManageManualsView();
                }
                if (viewId === 'view-user-management' && typeof fetchAndRenderUsersList === 'function') {
                    fetchAndRenderUsersList();
                }
                if (viewId === 'view-purchase') {
                    if (typeof closePurchaseSubSection === 'function') closePurchaseSubSection();
                    const isAdmin = currentUser && currentUser.role === 'ADMIN';
                    const cardManage = document.getElementById('card-manage-orders');
                    if (cardManage) cardManage.classList.toggle('hidden', !isAdmin);
                    const cardHistory = document.getElementById('card-purchase-history');
                    if (cardHistory) cardHistory.classList.toggle('hidden', !isAdmin);
                    const cardOverview = document.getElementById('card-purchase-overview');
                    if (cardOverview) cardOverview.classList.toggle('hidden', !isAdmin);
                }

                updateSidebarHighlight(viewId, element);

                // Update URL parameter without reload
                const newUrl = viewId === 'view-catalog' ? targetPage : `${targetPage}?view=${viewId}`;
                window.history.pushState({ viewId }, '', newUrl);
            } else {
                // Redirect to other page with query parameter
                window.location.href = `${targetPage}?view=${viewId}`;
            }

            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && !sidebar.classList.contains('-translate-x-full')) toggleSidebar();
            }
        }

        function updateSidebarHighlight(viewId, element = null) {
            document.querySelectorAll('.menu-item').forEach(el => {
                el.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                el.classList.add('text-gray-300');
            });

            let activeEl = element;
            if (!activeEl) {
                const navItem = document.querySelector(`[data-view="${viewId}"] a`) || document.querySelector(`[onclick*="${viewId}"]`);
                if (navItem) activeEl = navItem;
            }

            if (activeEl) {
                activeEl.classList.remove('text-gray-300');
                activeEl.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
            }
        }

        function injectSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (!sidebar) return;
            
            sidebar.innerHTML = `
                <div class="p-5 flex justify-between items-center border-b border-slate-700/50">
                    <h1 class="text-xl font-bold truncate tracking-wide"><i class="fa-solid fa-gears mr-2 text-blue-400"></i> Spare Parts LDT</h1>
                    <button class="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition" onclick="toggleSidebar()">
                        <i class="fa-solid fa-times text-xl"></i>
                    </button>
                </div>
                <nav class="flex-1 overflow-y-auto py-6 hide-scroll">
                    <ul class="space-y-1.5 px-3 text-sm font-medium">
                        <li data-view="view-catalog"><a href="#" onclick="switchView('view-catalog', this)" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-box-open mr-3 w-5 text-center flex-shrink-0"></i><span class="flex-1">แคตตาล็อกสินค้า</span><i class="fa-solid fa-globe text-blue-300 text-xs"></i></a></li>
                        
                        <li class="protected-nav-item hidden border-t border-slate-700/30 my-1 pt-1" data-view="divider-pos"></li>
                        <li class="protected-nav-item hidden" data-view="view-pos"><a href="#" onclick="switchView('view-pos', this); if (typeof initPOS === 'function') initPOS();" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-calculator mr-3 w-5 text-center flex-shrink-0 text-amber-400"></i><span class="font-bold text-amber-300">ระบบเบิกจ่าย (POS)</span></a></li>
                        <li class="protected-nav-item hidden" data-view="view-transactions"><a href="#" onclick="switchView('view-transactions', this); if (typeof loadTransactions === 'function') loadTransactions();" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-receipt mr-3 w-5 text-center flex-shrink-0"></i><span>ประวัติการเบิกจ่าย</span></a></li>
                        
                        <li class="protected-nav-item hidden" data-view="view-restock"><a href="#" onclick="switchView('view-restock', this);" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-boxes-stacked mr-3 w-5 text-center flex-shrink-0 text-sky-400"></i><span class="font-bold text-sky-300">เติมสต็อกอะไหล่</span></a></li>
                        
                        <li class="protected-nav-item hidden border-t border-slate-700/30 my-1 pt-1" data-view="divider-admin"></li>
                        <li class="protected-nav-item hidden" data-view="view-purchase"><a href="#" onclick="switchView('view-purchase', this);" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-cart-shopping mr-3 w-5 text-center flex-shrink-0 text-indigo-400"></i><span>งานจัดซื้อ</span></a></li>
                        <li class="protected-nav-item hidden" data-view="view-report"><a href="#" onclick="switchView('view-report', this)" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-chart-pie mr-3 w-5 text-center flex-shrink-0 text-emerald-400"></i><span>Report</span></a></li>
                        <li class="protected-nav-item hidden" data-view="view-settings"><a href="#" onclick="switchView('view-settings', this); if (typeof initSettingsView === 'function') initSettingsView();" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-cog mr-3 w-5 text-center flex-shrink-0 text-slate-400"></i><span>ตั้งค่าระบบ</span></a></li>
                        
                        <li id="nav-item-manual" data-view="view-manual"><a href="#" onclick="switchView('view-manual', this); if (typeof initManualView === 'function') initManualView();" class="menu-item flex items-center px-4 py-3.5 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition-all"><i class="fa-solid fa-book mr-3 w-5 text-center flex-shrink-0 text-purple-400"></i><span>คู่มือ</span></a></li>
                    </ul>
                </nav>
                <div class="border-t border-slate-700/50 bg-slate-900/60">
                    <div id="auth-login-prompt" class="p-4">
                        <button onclick="showLoginDialog()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/30 hover:-translate-y-0.5">
                            <i class="fa-solid fa-right-to-bracket"></i> เข้าระบบคลัง
                        </button>
                        <p class="text-center text-[10px] text-slate-500 mt-2">เฉพาะผู้มีส่วนเกี่ยวข้องเท่านั้น</p>
                    </div>
                    <div id="auth-user-info" class="hidden p-4">
                        <div class="flex items-center gap-3 mb-3 bg-slate-700/50 rounded-xl px-3 py-2.5">
                            <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-user text-white text-xs"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] text-slate-400">ล็อกอินในฐานะ</p>
                                <p id="auth-username-display" class="text-sm font-bold text-white truncate"></p>
                            </div>
                        </div>
                        <button onclick="initDatabase()" class="w-full mb-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-blue-300 hover:text-blue-200 transition text-xs font-medium">
                            <i class="fa-solid fa-database mr-1"></i> ตรวจสอบ Database
                        </button>
                        <button onclick="logout()" class="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-900/50 hover:bg-red-800 rounded-lg text-red-300 hover:text-red-100 transition text-xs font-medium">
                            <i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
                        </button>
                    </div>
                    <p class="text-center text-[9px] text-slate-600 pb-2">System v3.0 (Interactive Catalog)</p>
                </div>
            `;
        }function showRegisterDialog() {
            Swal.fire({
                title: '<i class="fa-solid fa-user-plus text-blue-500 mr-2"></i>สมัครสมาชิกใหม่',
                html: `
                    <div class="space-y-3 text-left mt-1 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">ชื่อ-สกุล <span class="text-red-500">*</span></label>
                            <input type="text" id="reg-fullname" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น นายสมชาย ใจดี">
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">แผนก/ฝ่ายงาน <span class="text-red-500">*</span></label>
                            <input type="text" id="reg-department" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น ซ่อมบำรุง (Maintenance)">
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">เบอร์โทรศัพท์ <span class="text-red-500">*</span></label>
                                <input type="text" id="reg-phone" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น 0891234567">
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">อีเมล <span class="text-red-500">*</span></label>
                                <input type="email" id="reg-email" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="เช่น somchai@gmail.com">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">รหัสผ่าน <span class="text-red-500">*</span></label>
                                <input type="password" id="reg-password" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="รหัสผ่าน 6 ตัวขึ้นไป">
                            </div>
                            <div>
                                <label class="block font-semibold text-gray-600 mb-1">ยืนยันรหัสผ่าน <span class="text-red-500">*</span></label>
                                <input type="password" id="reg-confirm-password" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="พิมพ์อีกครั้ง">
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1">ประเภทบุคคล (Personnel Type) <span class="text-red-500">*</span></label>
                            <select id="reg-usertype" class="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500">
                                <option value="" disabled selected>-- เลือกประเภทบุคคล --</option>
                                <option value="insource">Insource (บุคลากรภายใน)</option>
                                <option value="outsource">Outsource (บุคลากรภายนอก)</option>
                            </select>
                        </div>
                    </div>
                `,
                confirmButtonText: 'สมัครสมาชิก',
                confirmButtonColor: '#10b981',
                showCancelButton: true,
                cancelButtonText: 'ย้อนกลับไปล็อกอิน',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: () => {
                    const fullName = document.getElementById('reg-fullname').value.trim();
                    const department = document.getElementById('reg-department').value.trim();
                    const phone = document.getElementById('reg-phone').value.trim();
                    const email = document.getElementById('reg-email').value.trim();
                    const password = document.getElementById('reg-password').value;
                    const confirmPassword = document.getElementById('reg-confirm-password').value;
                    const userType = document.getElementById('reg-usertype').value;
                    
                    if (!fullName || !department || !phone || !email || !password || !confirmPassword || !userType) {
                        Swal.showValidationMessage('กรุณากรอกข้อมูลและเลือกประเภทบุคคลให้ครบถ้วนทุกช่อง');
                        return false;
                    }
                    if (password.length < 6) {
                        Swal.showValidationMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
                        return false;
                    }
                    if (password !== confirmPassword) {
                        Swal.showValidationMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
                        return false;
                    }
                    
                    return {
                        fullName: fullName,
                        department: department,
                        phone: phone,
                        email: email,
                        password: password,
                        userType: userType
                    };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    showLoading('กำลังลงทะเบียนบัญชีผู้ใช้...');
                    fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'registerUser',
                            payload: result.value
                        })
                    }).then(res => res.json())
                    .then(resData => {
                        hideLoading();
                        if (resData.status === 'success') {
                            Swal.fire({
                                icon: 'success',
                                title: 'สมัครสมาชิกสำเร็จ!',
                                text: 'คุณสามารถเข้าสู่ระบบด้วย อีเมล หรือ เบอร์โทรศัพท์ ได้ทันที',
                                confirmButtonText: 'ตกลง',
                                confirmButtonColor: '#10b981'
                            }).then(() => {
                                showLoginDialog();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'ลงทะเบียนล้มเหลว',
                                text: resData.message || 'ข้อมูลไม่ถูกต้อง',
                                confirmButtonText: 'ลองใหม่'
                            }).then(() => {
                                showRegisterDialog();
                            });
                        }
                    }).catch(err => {
                        hideLoading();
                        console.error(err);
                        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
                    });
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    showLoginDialog();
                }
            });
        }

        function showLoginDialog(onSuccess = null) {
            Swal.fire({
                title: '<i class="fa-solid fa-lock text-blue-500 mr-2"></i>เข้าสู่ระบบ',
                html: `
                    <div class="space-y-3 text-left mt-1 text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">อีเมล หรือ เบอร์โทรศัพท์</label>
                            <input type="text" id="swal-username"
                                class="swal2-input !mx-0 !w-full !text-xs !h-9"
                                placeholder="ระบุอีเมลหรือเบอร์โทรศัพท์"
                                autocomplete="username">
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">รหัสผ่าน (Password)</label>
                            <input type="password" id="swal-password"
                                class="swal2-input !mx-0 !w-full !text-xs !h-9"
                                placeholder="••••••••"
                                autocomplete="current-password">
                        </div>
                        <div class="text-center pt-2">
                            <a href="#" onclick="event.preventDefault(); Swal.close(); showRegisterDialog();" class="text-xs text-blue-600 hover:text-blue-500 font-bold hover:underline">
                                <i class="fa-solid fa-user-plus mr-1"></i> ยังไม่มีบัญชี? สมัครสมาชิกใหม่
                            </a>
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-right-to-bracket mr-2"></i>เข้าสู่ระบบ',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    document.getElementById('swal-password').addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') Swal.clickConfirm();
                    });
                },
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const username = document.getElementById('swal-username').value.trim();
                    const password = document.getElementById('swal-password').value;
                    
                    if (!username || !password) {
                        Swal.showValidationMessage('กรุณากรอกทั้งข้อมูลชื่อผู้ใช้และรหัสผ่าน');
                        return false;
                    }
                    
                    return fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'loginUser',
                            payload: { username: username, password: password }
                        })
                    }).then(res => {
                        if (!res.ok) {
                            throw new Error('การเชื่อมต่อเซิร์ฟเวอร์ล้มเหลว');
                        }
                        return res.json();
                    }).then(resData => {
                        if (resData.status !== 'success') {
                            throw new Error(resData.message || 'อีเมล/เบอร์โทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง');
                        }
                        return resData.data; // User info object
                    }).catch(error => {
                        Swal.showValidationMessage(`<i class="fa-solid fa-circle-exclamation mr-2"></i>${error.message}`);
                    });
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    isLoggedIn = true;
                    currentUser = result.value; // Save full user object
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateAuthUI();
                    showToast(`ยินดีต้อนรับ ${currentUser.fullName}!`, 'success');
                    if (onSuccess) onSuccess();
                }
            });
        }

        function logout() {
            confirmAction(`ยืนยันการออกจากระบบ?\nคุณจะกลับไปยังหน้าแคตตาล็อกสาธารณะ`, () => {
                isLoggedIn = false;
                currentUser = null;
                sessionStorage.removeItem('currentUser');
                updateAuthUI();
                switchView('view-catalog');
                document.querySelectorAll('.menu-item').forEach(el => {
                    el.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                    el.classList.add('text-gray-300');
                });
                const catalogBtn = document.querySelector('[onclick="switchView(\'view-catalog\', this)"]');
                if (catalogBtn) {
                    catalogBtn.classList.remove('text-gray-300');
                    catalogBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-900/20');
                }
                showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
            });
        }

        function updateAuthUI() {
            document.querySelectorAll('.protected-nav-item').forEach(el => {
                if (!isLoggedIn) {
                    el.classList.add('hidden');
                } else {
                    const viewId = el.getAttribute('data-view');
                    if (viewId === 'divider-admin') {
                        el.classList.toggle('hidden', currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager');
                    } else if (viewId === 'divider-pos') {
                        el.classList.toggle('hidden', !hasAccess('view-pos') && !hasAccess('view-transactions'));
                    } else {
                        el.classList.toggle('hidden', !hasAccess(viewId));
                    }
                }
            });

            const manualNavItem = document.getElementById('nav-item-manual');
            if (manualNavItem) {
                if (!isLoggedIn) {
                    manualNavItem.classList.remove('hidden');
                } else {
                    manualNavItem.classList.toggle('hidden', !hasAccess('view-manual'));
                }
            }
            
            if (typeof initSettingsView === 'function') initSettingsView();
            
            const dbBtn = document.querySelector('[onclick="initDatabase()"]');
            if (dbBtn) {
                dbBtn.classList.toggle('hidden', !isLoggedIn || currentUser.role !== 'ADMIN');
            }

            document.getElementById('auth-login-prompt').classList.toggle('hidden', isLoggedIn);
            document.getElementById('auth-user-info').classList.toggle('hidden', !isLoggedIn);
            if (isLoggedIn && currentUser) {
                let roleColor = 'bg-gray-500';
                if (currentUser.role === 'ADMIN') roleColor = 'bg-red-600';
                else if (currentUser.role === 'Manager') roleColor = 'bg-amber-600';
                else if (currentUser.role === 'Technician') roleColor = 'bg-purple-600';
                else if (currentUser.role === 'StoreOfficer') roleColor = 'bg-emerald-600';
                
                let userTypeLabel = '';
                if (currentUser.role !== 'ADMIN' && currentUser.role !== 'Manager' && currentUser.role !== 'StoreOfficer') {
                    userTypeLabel = currentUser.userType === 'outsource' ? ' (Outsource)' : ' (Insource)';
                }
                
                document.getElementById('auth-username-display').innerHTML = `
                    <div class="flex flex-col text-left">
                        <span class="font-bold text-white text-xs truncate">${escapeHTML(currentUser.fullName)}</span>
                        <span class="text-[9px] text-gray-400 truncate mt-0.5">${escapeHTML(currentUser.department)}</span>
                        <span class="text-[8px] font-extrabold text-white px-1.5 py-0.5 rounded ${roleColor} w-max mt-1 uppercase">${currentUser.role === 'StoreOfficer' ? 'Store Officer' : currentUser.role}${userTypeLabel}</span>
                    </div>
                `;
            } else {
                if (typeof closeProductDetailModal === 'function') closeProductDetailModal();
            }
            if (typeof db !== 'undefined' && db && db.products && db.products.length > 0) {
                if (typeof renderCatalog === 'function') renderCatalog();
            }
        }

        // ===== SweetAlert2 Notification System =====
        const SwalToast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });

        function showLoading(text = 'กำลังโหลดข้อมูล...') {
            Swal.fire({
                title: text,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => { Swal.showLoading(); }
            });
        }

        function hideLoading() { Swal.close(); }

        function showToast(message, type = 'success') {
            const iconMap = { success: 'success', error: 'error', info: 'info' };
            SwalToast.fire({
                icon: iconMap[type] || 'success',
                title: message
            });
        }

        function confirmAction(message, callback) {
            Swal.fire({
                title: 'ยืนยันการดำเนินการ',
                html: escapeHTML(message).replace(/\n/g, '<br>'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: '<i class="fa-solid fa-check mr-1"></i> ยืนยัน',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl shadow-2xl',
                    confirmButton: 'rounded-xl font-semibold px-5',
                    cancelButton: 'rounded-xl font-semibold px-5',
                }
            }).then((result) => {
                if (result.isConfirmed) callback();
            });
        }

        const LS_CACHE_KEY = 'spareparts_cache_v1';
        const LS_CACHE_TTL = 5 * 60 * 1000; // 5 นาที (ms)
        let isFirebaseListenerInitialized = false;
        let firebaseListenerPromise = null;
        let resolveFirstFetch = null;

        async function fetchData(forceRefresh = false) {
            // 1. ดึงข้อมูลจาก Cache ใน LocalStorage ขึ้นมาแสดงก่อนทันทีเพื่อความรวดเร็ว
            try {
                const raw = localStorage.getItem(LS_CACHE_KEY);
                if (raw) {
                    const cached = JSON.parse(raw);
                    const hasData = cached.data
                        && Array.isArray(cached.data.products)
                        && cached.data.products.length > 0;
                    if (hasData) {
                        db = cached.data;
                        updateAllViews();
                    }
                }
            } catch (e) {
                try { localStorage.removeItem(LS_CACHE_KEY); } catch(_) {}
            }

            // 2. ถ้ามีการกด Force Refresh หรือแอปยังไม่มีข้อมูลในตัวแปร db เลย ให้แสดง loading
            const hasNoData = !db || !db.products || db.products.length === 0;
            if (forceRefresh || hasNoData) {
                showLoading('กำลังซิงค์ข้อมูลระบบ...');
            }

            // 3. เริ่มต้นเปิด Real-time Listener (ถ้ายังไม่ได้รัน)
            if (!isFirebaseListenerInitialized) {
                isFirebaseListenerInitialized = true;
                
                firebaseListenerPromise = new Promise((resolve, reject) => {
                    resolveFirstFetch = resolve;
                    
                    try {
                        // ใช้ Firebase Realtime Database SDK เพื่อเปิดฟังข้อมูลแบบ Real-time (WebSocket)
                        firebase.database().ref().on('value', (snapshot) => {
                            try {
                                const fbData = snapshot.val();
                                if (fbData) {
                                    const ensureArray = (val) => {
                                        if (!val) return [];
                                        if (Array.isArray(val)) return val;
                                        if (typeof val === 'object') {
                                            return Object.keys(val)
                                                .sort((a, b) => Number(a) - Number(b))
                                                .map(key => val[key]);
                                        }
                                        return [];
                                    };

                                    const appDataNode = fbData.appData || {};
                                    const consolidated = {
                                        products: ensureArray(appDataNode.products),
                                        machines: ensureArray(appDataNode.machines),
                                        mappings: ensureArray(fbData.mappings),
                                        settings: appDataNode.settings || {},
                                        manuals: ensureArray(appDataNode.manuals),
                                        lots: ensureArray(fbData.lots),
                                        purchaseOrders: ensureArray(appDataNode.purchaseOrders)
                                    };

                                    if (consolidated.products && consolidated.products.length > 0) {
                                        db = consolidated;
                                        try {
                                            localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ data: db, ts: Date.now() }));
                                        } catch(e) {}
                                        
                                        updateAllViews();
                                    }
                                }
                            } catch (err) {
                                console.error("Error in Firebase real-time listener callback:", err);
                            } finally {
                                // โหลดข้อมูลเสร็จเรียบร้อยในรอบแรก
                                if (resolveFirstFetch) {
                                    resolveFirstFetch();
                                    resolveFirstFetch = null;
                                }
                                hideLoading();
                            }
                        }, (fbErr) => {
                            console.warn("Real-time sync failed. Falling back to Google Apps Script:", fbErr);
                            // หากต่อ Firebase ไม่ได้ ให้ข้ามไปดึงข้อมูลผ่าน Apps Script แทน
                            _fetchFromBackupServer().then(resolve).catch(reject);
                        });
                    } catch (err) {
                        console.error("Firebase SDK Listener Setup Error:", err);
                        _fetchFromBackupServer().then(resolve).catch(reject);
                    }
                });
            } else {
                // ถ้า Listener ทำงานอยู่แล้ว
                if (forceRefresh) {
                    // หากผู้ใช้กด Refresh ด้วยตัวเอง ให้แสดงว่าอัปเดตแล้ว (เนื่องจาก Listener ดึงข้อมูลล่าสุดให้อยู่ตลอดเวลาอยู่แล้ว)
                    await new Promise(resolve => setTimeout(resolve, 500));
                    hideLoading();
                    showToast('ข้อมูลเป็นปัจจุบันแล้ว');
                }
            }

            // รอจนกว่าจะดึงข้อมูลเสร็จสิ้นในรอบแรก (ถ้าจำเป็น)
            if (firebaseListenerPromise) {
                await firebaseListenerPromise;
            }
        }

        async function _fetchFromBackupServer() {
            try {
                const res = await fetch(API_URL + '?action=getAppData', { method: 'GET' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                
                if (data && Array.isArray(data.products)) {
                    db = data;
                    try {
                        localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
                    } catch(e) {}
                    updateAllViews();
                } else {
                    throw new Error('ข้อมูลที่ได้รับไม่ถูกต้อง');
                }
            } catch (error) {
                showToast('ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
            }
            hideLoading();
        }
// ==========================================
// Firebase Direct Backend Bypass Interceptor
// ==========================================

const BYPASS_ACTIONS = [
    'editProduct',
    'editMachine',
    'editManual',
    'getTransactions',
    'checkoutOrder',
    'restockProduct',
    'cancelTransaction',
    'deleteTransaction',
    'addMapping',
    'deleteMapping',
    'saveSettings',
    'getUsersList',
    'loginUser',
    'registerUser',
    'updateUserByAdmin',
    'deleteUserByAdmin',
    'updateSelfProfile',
    'addPurchaseOrderDraft',
    'editPurchaseOrderDraft',
    'deletePurchaseOrderDraft',
    'deletePurchaseOrderActive',
    'updatePurchaseOrderDraft',
    'receivePurchaseGoods'
];

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getFormattedDateTimeString() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function handleActionDirectlyOnFirebase(action, payload) {
    try {
        switch (action) {
            case 'editProduct':
                await executeDirectEditProduct(payload);
                return { status: 'success', message: 'บันทึกแก้ไขสินค้าสำเร็จ' };
            case 'editMachine':
                await executeDirectEditMachine(payload);
                return { status: 'success', message: 'บันทึกแก้ไขเครื่องจักรสำเร็จ' };
            case 'editManual':
                const manualRes = await executeDirectEditManual(payload);
                return { status: 'success', data: manualRes, message: 'บันทึกแก้ไขคู่มือสำเร็จ' };
            case 'getTransactions':
                return { status: 'success', data: await executeDirectGetTransactions() };
            case 'loginUser':
                return { status: 'success', data: await executeDirectLogin(payload) };
            case 'registerUser':
                await executeDirectRegister(payload);
                return { status: 'success', message: 'สมัครสมาชิกสำเร็จ รอการอนุมัติสิทธิ์' };
            case 'getUsersList':
                return { status: 'success', data: await executeDirectGetUsersList(payload) };
            case 'updateUserByAdmin':
                await executeDirectUpdateUserByAdmin(payload);
                return { status: 'success', message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' };
            case 'deleteUserByAdmin':
                await executeDirectDeleteUserByAdmin(payload);
                return { status: 'success', message: 'ลบผู้ใช้สำเร็จ' };
            case 'updateSelfProfile':
                return { status: 'success', data: await executeDirectUpdateSelfProfile(payload), message: 'อัปเดตโปรไฟล์สำเร็จ' };
            case 'checkoutOrder':
                return { status: 'success', data: await executeDirectCheckout(payload) };
            case 'restockProduct':
                return { status: 'success', data: await executeDirectRestock(payload) };
            case 'cancelTransaction':
                await executeDirectCancelTransaction(payload);
                return { status: 'success', message: 'ยกเลิกใบเบิกสำเร็จ คืนสต็อกอะไหล่เข้าคลังเรียบร้อยแล้ว' };
            case 'deleteTransaction':
                await executeDirectDeleteTransaction(payload);
                return { status: 'success', message: 'ลบประวัติใบเบิกสำเร็จเรียบร้อยแล้ว' };
            case 'addMapping':
                await executeDirectAddMapping(payload);
                return { status: 'success', message: 'บันทึกการจับคู่สำเร็จ' };
            case 'deleteMapping':
                await executeDirectDeleteMapping(payload);
                return { status: 'success', message: 'ยกเลิกการจับคู่สำเร็จ' };
            case 'saveSettings':
                await executeDirectSaveSettings(payload);
                return { status: 'success', message: 'บันทึกตั้งค่าสำเร็จ' };
            case 'addPurchaseOrderDraft':
                return { status: 'success', data: await executeDirectAddPurchaseOrderDraft(payload) };
            case 'editPurchaseOrderDraft':
                await executeDirectEditPurchaseOrderDraft(payload);
                return { status: 'success', message: 'แก้ไขจำนวนสั่งซื้อสำเร็จ' };
            case 'deletePurchaseOrderDraft':
                await executeDirectDeletePurchaseOrderDraft(payload);
                return { status: 'success', message: 'ลบรายการสั่งซื้อสำเร็จ' };
            case 'deletePurchaseOrderActive':
                await executeDirectDeletePurchaseOrderActive(payload);
                return { status: 'success', message: 'ลบรายการจัดซื้อสำเร็จ' };
            case 'updatePurchaseOrderDraft':
                await executeDirectUpdatePurchaseOrderDraft(payload);
                return { status: 'success', message: 'บันทึกการแก้ไขใบจัดซื้อสำเร็จ' };
            case 'receivePurchaseGoods':
                return { status: 'success', data: await executeDirectReceivePurchaseGoods(payload) };
            default:
                throw new Error("Action not supported directly on Firebase");
        }
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}

let transactionsCache = null;

async function executeDirectEditProduct(payload) {
    const snapshot = await firebase.database().ref('appData/products').get();
    let products = ensureArray(snapshot.val());
    const index = products.findIndex(p => String(p.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบรหัสสินค้าที่ต้องการแก้ไข");
    const oldProduct = products[index];
    const cost = parseFloat(payload.cost) || 0;
    
    let factorA = 1.05, factorB = 1.10, factorC = 1.20;
    if (cost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
    else if (cost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
    
    const pA = parseFloat(payload.price_a) > 0 ? parseFloat(payload.price_a) : Math.ceil(cost * factorA);
    const pB = parseFloat(payload.price_b) > 0 ? parseFloat(payload.price_b) : Math.ceil(cost * factorB);
    const pC = parseFloat(payload.price_c) > 0 ? parseFloat(payload.price_c) : Math.ceil(cost * factorC);
    const stockQty = (payload.stock_qty !== undefined && payload.stock_qty !== "") ? parseFloat(payload.stock_qty) : (parseFloat(oldProduct.stock_qty) || 0);
    
    products[index] = {
        id: payload.id, name: payload.name, unit: payload.unit, cost: cost,
        price_a: pA, price_b: pB, price_c: pC,
        category: payload.category, note: payload.note, image_url: oldProduct.image_url || "",
        stock_qty: stockQty, group: payload.group || "", supplier: payload.supplier || "", storage: payload.storage || ""
    };
    await firebase.database().ref('appData/products').set(products);
    db.products = products;
    invalidateLocalCache();
}

async function executeDirectEditMachine(payload) {
    const snapshot = await firebase.database().ref('appData/machines').get();
    let machines = ensureArray(snapshot.val());
    const index = machines.findIndex(m => String(m.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบเครื่องจักรที่ต้องการแก้ไข");
    const oldMachine = machines[index];
    machines[index] = {
        id: payload.id, name: payload.name, image_url: oldMachine.image_url || "", cost: parseFloat(payload.cost) || 0,
        price_a: parseFloat(payload.price_a) || 0, price_b: parseFloat(payload.price_b) || 0, price_c: parseFloat(payload.price_c) || 0,
        note: payload.note || "", group: payload.group || "", supplier: payload.supplier || "", storage: payload.storage || ""
    };
    await firebase.database().ref('appData/machines').set(machines);
    db.machines = machines;
    invalidateLocalCache();
}

async function executeDirectEditManual(payload) {
    const snapshot = await firebase.database().ref('appData/manuals').get();
    let manuals = ensureArray(snapshot.val());
    const index = manuals.findIndex(m => String(m.id).trim() === String(payload.id).trim());
    if (index === -1) throw new Error("ไม่พบคู่มือที่ต้องการแก้ไข");
    const oldManual = manuals[index];
    manuals[index] = {
        id: payload.id, title: payload.title || "", description: payload.description || "",
        file_url: oldManual.file_url || "", file_type: payload.file_type || oldManual.file_type,
        uploaded_at: oldManual.uploaded_at || ""
    };
    await firebase.database().ref('appData/manuals').set(manuals);
    db.manuals = manuals;
    invalidateLocalCache();
    return { file_url: oldManual.file_url || "" };
}

async function executeDirectGetTransactions() {
    if (transactionsCache) {
        console.log("[Firebase Bypass] Returning transactions from memory cache");
        return transactionsCache;
    }
    const snapshot = await firebase.database().ref('transactions').get();
    transactionsCache = ensureArray(snapshot.val()).reverse();
    return transactionsCache;
}

async function executeDirectLogin(payload) {
    const username = String(payload.username).trim().toLowerCase();
    const password = String(payload.password);
    if (!username || !password) throw new Error("กรุณากรอกข้อมูลการเข้าสู่ระบบ");
    
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    const hash = await sha256(password);
    
    const user = users.find(u => (String(u.email).toLowerCase() === username || String(u.phone).trim() === username));
    if (!user) throw new Error("ไม่พบชื่อผู้ใช้ (อีเมลหรือเบอร์โทรศัพท์) ในระบบ");
    if (user.passwordHash !== hash) throw new Error("รหัสผ่านไม่ถูกต้อง");
    
    return {
        fullName: user.fullName,
        department: user.department,
        phone: user.phone,
        email: user.email,
        role: user.role,
        priceLevel: user.priceLevel || "A",
        userType: user.userType || "insource"
    };
}

async function executeDirectRegister(payload) {
    const fullName = String(payload.fullName || "").trim();
    const department = String(payload.department || "").trim();
    const phone = String(payload.phone || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const userType = payload.userType ? String(payload.userType).trim() : "";
    if (!fullName || !department || !phone || !email || !password || !userType) {
        throw new Error("กรุณากรอกข้อมูลและเลือกประเภทบุคคลให้ครบถ้วน");
    }
    
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    if (users.some(u => String(u.email || "").toLowerCase() === email)) throw new Error("อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว");
    if (users.some(u => String(u.phone || "").trim() === phone)) throw new Error("เบอร์โทรศัพท์นี้ถูกใช้สมัครสมาชิกแล้ว");
    
    const newUser = {
        fullName: fullName,
        department: department,
        phone: phone,
        email: email,
        passwordHash: await sha256(password),
        role: "user",
        priceLevel: "A",
        userType: userType
    };
    users.push(newUser);
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectGetUsersList(payload) {
    const snapshot = await firebase.database().ref('users').get();
    return ensureArray(snapshot.val());
}

async function executeDirectUpdateUserByAdmin(payload) {
    const email = String(payload.targetEmail || payload.email || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    const index = users.findIndex(u => String(u.email || "").toLowerCase() === email);
    if (index === -1) throw new Error("ไม่พบอีเมลผู้ใช้ที่ต้องการแก้ไข");
    
    users[index].fullName = String(payload.fullName || users[index].fullName).trim();
    users[index].department = String(payload.department || users[index].department).trim();
    users[index].phone = String(payload.phone || users[index].phone).trim();
    users[index].role = String(payload.newRole || payload.role || users[index].role).trim();
    users[index].priceLevel = String(payload.newPriceLevel || payload.priceLevel || users[index].priceLevel || "A").trim();
    users[index].userType = String(payload.newUserType || payload.userType || users[index].userType || "insource").trim();
    
    if (payload.password) {
        users[index].passwordHash = await sha256(payload.password);
    }
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectDeleteUserByAdmin(payload) {
    const email = String(payload.targetEmail || payload.email || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    let users = ensureArray(snapshot.val());
    
    users = users.filter(u => String(u.email || "").toLowerCase() !== email);
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
}

async function executeDirectUpdateSelfProfile(payload) {
    const currentEmail = String(payload.currentEmail || "").trim().toLowerCase();
    const snapshot = await firebase.database().ref('users').get();
    const users = ensureArray(snapshot.val());
    
    const index = users.findIndex(u => String(u.email || "").toLowerCase() === currentEmail);
    if (index === -1) throw new Error("ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ");
    
    const newEmail = String(payload.email || "").trim().toLowerCase();
    if (newEmail !== currentEmail && users.some(u => String(u.email || "").toLowerCase() === newEmail)) {
        throw new Error("อีเมลใหม่นี้ถูกใช้งานแล้ว");
    }
    
    users[index].fullName = String(payload.fullName || users[index].fullName).trim();
    users[index].department = String(payload.department || users[index].department).trim();
    users[index].phone = String(payload.phone || users[index].phone).trim();
    users[index].email = newEmail;
    
    if (payload.password) {
        users[index].passwordHash = await sha256(payload.password);
    }
    
    await firebase.database().ref('users').set(users);
    invalidateLocalCache();
    
    return {
        fullName: users[index].fullName,
        department: users[index].department,
        phone: users[index].phone,
        email: users[index].email,
        role: users[index].role,
        priceLevel: users[index].priceLevel || "A",
        userType: users[index].userType || "insource"
    };
}

async function executeDirectCheckout(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const cart = payload.cart;
    const prodMap = {};
    products.forEach(p => {
        prodMap[p.id] = p;
    });
    
    // ตรวจสอบสต็อก
    cart.forEach(item => {
        const product = prodMap[item.id];
        if (!product) throw new Error("ไม่พบอะไหล่รหัส " + item.id + " ในระบบ");
        
        const stockQty = parseFloat(product.stock_qty) || 0;
        if (stockQty < item.qty) {
            throw new Error("สต็อกไม่เพียงพอ: อะไหล่ " + product.name + " (" + item.id + ") มีคงเหลือ " + stockQty + " ชิ้น แต่พยายามเบิก " + item.qty + " ชิ้น");
        }
        
        const prodLots = lots.filter(l => String(l.product_id).trim() === String(item.id).trim() && (parseFloat(l.remaining_qty) || 0) > 0);
        const totalLotQty = prodLots.reduce((sum, l) => sum + (parseFloat(l.remaining_qty) || 0), 0);
        if (totalLotQty < stockQty) {
            const diff = stockQty - totalLotQty;
            lots.push({
                lot_id: "LOT-SUPP-" + item.id + "-" + Date.now(),
                product_id: item.id,
                cost: parseFloat(product.cost) || 0,
                price_a: parseFloat(product.price_a) || 0,
                price_b: parseFloat(product.price_b) || 0,
                price_c: parseFloat(product.price_c) || 0,
                initial_qty: diff,
                remaining_qty: diff,
                created_at: getFormattedDateTimeString(),
                note: "Lot สำรองคงเหลือ"
            });
        }
    });
    
    // ตัดสต็อก FIFO
    const checkoutItems = [];
    cart.forEach(item => {
        const product = prodMap[item.id];
        let neededQty = item.qty;
        
        const availableLots = lots.filter(l => String(l.product_id).trim() === String(item.id).trim() && (parseFloat(l.remaining_qty) || 0) > 0)
                                  .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        
        availableLots.forEach(lot => {
            if (neededQty <= 0) return;
            const remaining = parseFloat(lot.remaining_qty) || 0;
            const takeQty = Math.min(remaining, neededQty);
            
            lot.remaining_qty = remaining - takeQty;
            neededQty -= takeQty;
            
            let lotPrice = item.price;
            if (item.priceLevel === 'A' && lot.price_a) lotPrice = parseFloat(lot.price_a) || 0;
            else if (item.priceLevel === 'B' && lot.price_b) lotPrice = parseFloat(lot.price_b) || 0;
            else if (item.priceLevel === 'C' && lot.price_c) lotPrice = parseFloat(lot.price_c) || 0;
            
            checkoutItems.push({
                detail_id: "",
                product_id: item.id,
                lot_id: lot.lot_id,
                qty: takeQty,
                unit_cost: parseFloat(lot.cost) || 0,
                price: lotPrice,
                subtotal: takeQty * lotPrice
            });
        });
        
        product.stock_qty = (parseFloat(product.stock_qty) || 0) - item.qty;
    });
    
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePrefix = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const dateStr = getFormattedDateTimeString();
    
    let counter = 1;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        if (lastTx && lastTx.id && String(lastTx.id).indexOf("LDT-" + datePrefix) === 0) {
            const parts = String(lastTx.id).split("-");
            const lastNum = parseInt(parts[2], 10);
            if (!isNaN(lastNum)) counter = lastNum + 1;
        }
    }
    const txId = "LDT-" + datePrefix + "-" + String(counter).padStart(4, '0');
    
    let calcTotalPrice = 0;
    checkoutItems.forEach((it, idx) => {
        it.detail_id = txId + "-" + (idx + 1);
        calcTotalPrice += it.subtotal;
    });
    
    const newTransaction = {
        id: txId,
        date: dateStr,
        requester: payload.requester,
        department: payload.department,
        machine_id: payload.machine_id,
        serial_number: payload.serial_number || "",
        total_price: payload.total_price || calcTotalPrice,
        note: payload.note || "",
        status: "Success",
        items: checkoutItems
    };
    transactions.push(newTransaction);
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
    
    return { transaction_id: txId, items: checkoutItems };
}

async function executeDirectRestock(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const product = products.find(p => String(p.id).trim() === String(payload.id).trim());
    if (!product) throw new Error("ไม่พบของต้องการปรับปรุงสต็อก");
    
    const qty = parseFloat(payload.qty) || 0;
    const cost = (payload.cost !== undefined && payload.cost !== "") ? parseFloat(payload.cost) : (parseFloat(product.cost) || 0);
    const pA = (payload.price_a !== undefined && payload.price_a !== "") ? parseFloat(payload.price_a) : (parseFloat(product.price_a) || 0);
    const pB = (payload.price_b !== undefined && payload.price_b !== "") ? parseFloat(payload.price_b) : (parseFloat(product.price_b) || 0);
    const pC = (payload.price_c !== undefined && payload.price_c !== "") ? parseFloat(payload.price_c) : (parseFloat(product.price_c) || 0);
    
    const lotId = "LOT-" + payload.id + "-" + Date.now();
    lots.push({
        lot_id: lotId,
        product_id: payload.id,
        cost: cost,
        price_a: pA,
        price_b: pB,
        price_c: pC,
        initial_qty: qty,
        remaining_qty: qty,
        created_at: getFormattedDateTimeString(),
        note: payload.note || "เติมสต็อกสินค้า"
    });
    
    product.stock_qty = (parseFloat(product.stock_qty) || 0) + qty;
    product.cost = cost;
    product.price_a = pA;
    product.price_b = pB;
    product.price_c = pC;
    
    let lastTxId = 0;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        lastTxId = parseInt(String(lastTx.id).replace("TX-", "")) || 0;
    }
    const nextTxId = "TX-" + String(lastTxId + 1).padStart(6, '0');
    
    const newRestockTransaction = {
        id: nextTxId,
        requester: payload.requester,
        department: payload.department || "สโตร์ (Restock)",
        machine_id: "RESTOCK",
        serial_number: "",
        total_price: 0,
        note: payload.note || "เติมสต็อกสินค้า",
        created_at: getFormattedDateTimeString(),
        status: "Restock",
        items: [{
            lot_id: lotId,
            product_id: payload.id,
            qty: qty,
            cost: cost,
            price: 0
        }]
    };
    transactions.push(newRestockTransaction);
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
    
    return { new_stock: product.stock_qty, transaction_id: nextTxId, lot_id: lotId };
}

async function executeDirectCancelTransaction(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const txId = String(payload.transaction_id).trim();
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) throw new Error("ไม่พบรหัสใบเบิก " + txId);
    
    const targetTx = transactions[txIndex];
    if (targetTx.status === "Cancelled") throw new Error("ใบเบิกนี้ถูกยกเลิกไปแล้ว");
    
    targetTx.items.forEach(item => {
        const prod = products.find(p => String(p.id).trim() === String(item.product_id).trim());
        if (prod) {
            prod.stock_qty = (parseFloat(prod.stock_qty) || 0) + item.qty;
        }
        if (item.lot_id) {
            const lot = lots.find(l => l.lot_id === item.lot_id);
            if (lot) {
                lot.remaining_qty = (parseFloat(lot.remaining_qty) || 0) + item.qty;
            }
        }
    });
    
    transactions[txIndex].status = "Cancelled";
    
    const updates = {};
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    invalidateLocalCache();
}

async function executeDirectDeleteTransaction(payload) {
    const snapshot = await firebase.database().ref('transactions').get();
    let transactions = ensureArray(snapshot.val());
    
    const txId = String(payload.transaction_id).trim();
    transactions = transactions.filter(t => t.id !== txId);
    
    await firebase.database().ref('transactions').set(transactions);
    transactionsCache = null; // Invalidate cache
    db.transactions = transactions;
    invalidateLocalCache();
}

async function executeDirectAddMapping(payload) {
    const snapshot = await firebase.database().ref('mappings').get();
    let mappings = ensureArray(snapshot.val());
    
    let productIds = Array.isArray(payload.product_ids) ? payload.product_ids : [payload.product_id];
    let machineId = String(payload.machine_id);
    
    let isModified = false;
    productIds.forEach(pid => {
        let cleanPid = String(pid);
        if (!cleanPid) return;
        let isDuplicate = mappings.some(m => String(m.product_id) === cleanPid && String(m.machine_id) === machineId);
        if (!isDuplicate) {
            mappings.push({ product_id: cleanPid, machine_id: machineId });
            isModified = true;
        }
    });
    
    if (isModified) {
        await firebase.database().ref('mappings').set(mappings);
        db.mappings = mappings;
        invalidateLocalCache();
    } else {
        throw new Error("รายการอะไหล่ที่เลือก ถูกจับคู่กับเครื่องจักรนี้อยู่แล้วทั้งหมด");
    }
}

async function executeDirectDeleteMapping(payload) {
    const snapshot = await firebase.database().ref('mappings').get();
    let mappings = ensureArray(snapshot.val());
    
    let pid = String(payload.product_id);
    let mid = String(payload.machine_id);
    mappings = mappings.filter(m => !(String(m.product_id) === pid && String(m.machine_id) === mid));
    
    await firebase.database().ref('mappings').set(mappings);
    db.mappings = mappings;
    invalidateLocalCache();
}

async function executeDirectSaveSettings(payload) {
    await firebase.database().ref('appData/settings').set(payload);
    db.settings = payload;
    invalidateLocalCache();
}

async function executeDirectAddPurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let products = ensureArray(fbData.appData?.products);
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    
    const productId = String(payload.productId).trim();
    const productName = String(payload.productName).trim();
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    const todayStr = new Date().toISOString().split('T')[0];
    let currentCost = 0;
    let currentSupplier = "";
    
    const product = products.find(p => String(p.id).trim() === productId);
    if (product) {
        currentCost = parseFloat(product.cost) || 0;
        currentSupplier = String(product.supplier || "").trim();
    }
    
    const newPoNumber = "PO-DRF-" + Date.now();
    const newPo = {
        poNumber: newPoNumber,
        prNumber: "",
        productId: productId,
        productName: productName,
        orderDate: todayStr,
        orderedQty: orderedQty,
        receivedQty: 0,
        lastReceivedDate: "",
        status: "เตรียมสั่ง",
        unitCost: currentCost,
        totalCost: orderedQty * currentCost,
        supplier: currentSupplier
    };
    
    purchaseOrders.push(newPo);
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
    
    return newPo;
}

async function executeDirectEditPurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    const purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    const productId = String(payload.productId).trim();
    const index = purchaseOrders.findIndex(o => String(o.poNumber).trim() === poNumber && String(o.productId).trim() === productId);
    if (index === -1) throw new Error("ไม่พบรายการใบสั่งซื้อที่ต้องการแก้ไข");
    
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    purchaseOrders[index].orderedQty = orderedQty;
    purchaseOrders[index].totalCost = orderedQty * (parseFloat(purchaseOrders[index].unitCost) || 0);
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectDeletePurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    let purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    const productId = String(payload.productId).trim();
    purchaseOrders = purchaseOrders.filter(o => !(String(o.poNumber).trim() === poNumber && String(o.productId).trim() === productId));
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectDeletePurchaseOrderActive(payload) {
    const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
    let purchaseOrders = ensureArray(snapshot.val());
    
    const poNumber = String(payload.poNumber).trim();
    purchaseOrders = purchaseOrders.filter(o => String(o.poNumber).trim() !== poNumber);
    
    await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
}

async function executeDirectUpdatePurchaseOrderDraft(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    let products = ensureArray(fbData.appData?.products);
    
    const originalPoNumber = String(payload.originalPoNumber).trim();
    const newPoNumber = String(payload.newPoNumber || '').trim();
    const newPrNumber = String(payload.newPrNumber || '').trim();
    const orderedQty = parseFloat(payload.orderedQty) || 0;
    const unitCost = parseFloat(payload.unitCost) || 0;
    const status = String(payload.status || '').trim();
    const productId = String(payload.productId).trim();
    const newSupplier = String(payload.newSupplier || '').trim();
    const newUnit = String(payload.newUnit || '').trim();
    
    if (orderedQty <= 0) throw new Error("จำนวนที่สั่งต้องมากกว่า 0");
    
    const index = purchaseOrders.findIndex(o => String(o.poNumber).trim() === originalPoNumber);
    if (index === -1) throw new Error("ไม่พบรายการใบสั่งซื้อต้นฉบับ " + originalPoNumber);
    
    let currentStatus = String(purchaseOrders[index].status).trim();
    if (status) {
        currentStatus = status;
    } else if (newPoNumber && newPoNumber.indexOf("PO-DRF-") !== 0) {
        currentStatus = "สั่งแล้ว";
    }
    
    purchaseOrders[index] = {
        poNumber: newPoNumber || originalPoNumber,
        prNumber: newPrNumber || "PR-DRAFT",
        productId: productId,
        productName: purchaseOrders[index].productName,
        orderDate: purchaseOrders[index].orderDate,
        orderedQty: orderedQty,
        receivedQty: parseFloat(purchaseOrders[index].receivedQty) || 0,
        lastReceivedDate: purchaseOrders[index].lastReceivedDate || "",
        status: currentStatus,
        unitCost: unitCost,
        totalCost: orderedQty * unitCost,
        supplier: newSupplier
    };

    // Update master product record if found
    const product = products.find(p => String(p.id).trim() === productId);
    if (product) {
        product.cost = unitCost;
        product.supplier = newSupplier;
        if (newUnit) {
            product.unit = newUnit;
        }

        // Auto-pricing update based on new cost
        let factorA = 1.05;
        let factorB = 1.10;
        let factorC = 1.20;
        if (unitCost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
        else if (unitCost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
        
        product.price_a = Math.ceil(unitCost * factorA);
        product.price_b = Math.ceil(unitCost * factorB);
        product.price_c = Math.ceil(unitCost * factorC);
    }
    
    const updates = {};
    updates["appData/purchaseOrders"] = purchaseOrders;
    updates["appData/products"] = products;
    
    await firebase.database().ref().update(updates);
    
    db.purchaseOrders = purchaseOrders;
    db.products = products;
    invalidateLocalCache();
}

async function executeDirectReceivePurchaseGoods(payload) {
    const snapshot = await firebase.database().ref().get();
    const fbData = snapshot.val() || {};
    
    let purchaseOrders = ensureArray(fbData.appData?.purchaseOrders);
    let products = ensureArray(fbData.appData?.products);
    let lots = ensureArray(fbData.lots);
    let transactions = ensureArray(fbData.transactions);
    
    const poNum = String(payload.poNumber).trim();
    const prodId = String(payload.productId || '').trim();
    const poIndex = purchaseOrders.findIndex(o =>
        String(o.poNumber).trim() === poNum &&
        (!prodId || String(o.productId).trim() === prodId)
    );
    if (poIndex === -1) throw new Error("ไม่พบรายการใบสั่งซื้อ " + poNum + (prodId ? ` (${prodId})` : ''));
    
    const po = purchaseOrders[poIndex];
    const recAmt = parseFloat(payload.receivedAmount) || 0;
    const currentReceived = parseFloat(po.receivedQty) || 0;
    const ordered = parseFloat(po.orderedQty) || 0;
    
    const newReceived = currentReceived + recAmt;
    if (newReceived > ordered) {
        throw new Error("จำนวนรับเข้าสะสม (" + newReceived + ") เกินจำนวนที่สั่งซื้อไว้ (" + ordered + ")");
    }
    
    const nowStr = new Date().toISOString().split('T')[0];
    po.receivedQty = newReceived;
    po.lastReceivedDate = nowStr;
    po.status = (newReceived === ordered) ? "ได้รับครบ" : "ค้างส่ง";
    
    const lotId = "LOT-PO-" + poNum + "-" + Date.now();
    const lotPrices = {
        price_a: 0,
        price_b: 0,
        price_c: 0
    };
    
    const product = products.find(p => String(p.id).trim() === String(po.productId).trim());
    if (product) {
        product.stock_qty = (parseFloat(product.stock_qty) || 0) + recAmt;
        product.cost = parseFloat(po.unitCost) || 0;
        
        // Auto prices
        const cost = parseFloat(po.unitCost) || 0;
        let factorA = 1.05;
        let factorB = 1.10;
        let factorC = 1.20;
        if (cost >= 10000) { factorA = 1.02; factorB = 1.05; factorC = 1.10; }
        else if (cost >= 5000) { factorA = 1.03; factorB = 1.07; factorC = 1.15; }
        
        product.price_a = Math.ceil(cost * factorA);
        product.price_b = Math.ceil(cost * factorB);
        product.price_c = Math.ceil(cost * factorC);
        
        lotPrices.price_a = product.price_a;
        lotPrices.price_b = product.price_b;
        lotPrices.price_c = product.price_c;
    }
    
    lots.push({
        lot_id: lotId,
        product_id: po.productId,
        cost: parseFloat(po.unitCost) || 0,
        price_a: lotPrices.price_a,
        price_b: lotPrices.price_b,
        price_c: lotPrices.price_c,
        initial_qty: recAmt,
        remaining_qty: recAmt,
        created_at: getFormattedDateTimeString(),
        note: "รับสินค้าจาก PO " + poNum
    });
    
    let lastTxId = 0;
    if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        lastTxId = parseInt(String(lastTx.id).replace("TX-", "")) || 0;
    }
    const nextTxId = "TX-" + String(lastTxId + 1).padStart(6, '0');
    
    transactions.push({
        id: nextTxId,
        requester: payload.requester || "สโตร์ (รับเข้า)",
        department: payload.department || "สโตร์ (รับเข้า)",
        machine_id: "PO_RECEIVE",
        serial_number: "",
        total_price: 0,
        note: "รับสินค้าจาก PO " + poNum,
        created_at: getFormattedDateTimeString(),
        status: "Restock",
        items: [{
            lot_id: lotId,
            product_id: po.productId,
            qty: recAmt,
            cost: parseFloat(po.unitCost) || 0,
            price: 0
        }]
    });
    
    const updates = {};
    updates["appData/purchaseOrders"] = purchaseOrders;
    updates["appData/products"] = products;
    updates["lots"] = lots;
    updates["transactions"] = transactions;
    await firebase.database().ref().update(updates);
    transactionsCache = null; // Invalidate cache
    
    db.purchaseOrders = purchaseOrders;
    invalidateLocalCache();
    db.products = products;
    db.lots = lots;
    db.transactions = transactions;
    
    return { status: "success", poNumber: poNum };
}

function ensureArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
        return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(key => val[key]);
    }
    return [];
}

function invalidateLocalCache() {
    try {
        localStorage.removeItem('spareparts_cache_v1');
        console.log("[Firebase Bypass] LocalStorage cache invalidated.");
    } catch (e) {
        console.error("Failed to clear localStorage cache: ", e);
    }
}

// Global Fetch Interceptor to bypass Apps Script
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    if (typeof url === 'string' && url.includes(API_URL) && options && options.method === 'POST') {
        try {
            const body = JSON.parse(options.body);
            const action = body.action;
            const payload = body.payload;
            
            if (BYPASS_ACTIONS.includes(action)) {
                // If there's an image/file upload, let it go to Apps Script
                if (action === 'editProduct' && payload && payload.imageBase64) {
                    console.log(`[Firebase Bypass] editProduct has image, letting Apps Script handle it.`);
                } else if (action === 'editMachine' && payload && payload.imageBase64) {
                    console.log(`[Firebase Bypass] editMachine has image, letting Apps Script handle it.`);
                } else if (action === 'editManual' && payload && payload.file_url && payload.file_url.indexOf("data:") === 0) {
                    console.log(`[Firebase Bypass] editManual has file payload, letting Apps Script handle it.`);
                } else {
                    console.log(`[Firebase Bypass] Intercepting action: ${action}`);
                    const result = await handleActionDirectlyOnFirebase(action, payload);
                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
        } catch (e) {
            console.error("Fetch interceptor parse error: ", e);
        }
    }
    return originalFetch.apply(this, arguments);
};

console.log("[Firebase Bypass] Interceptor activated successfully.");

function renderGenericPagination(containerId, infoId, controlsId, totalItems, currentPage, pageSize, changePageFuncName) {
    const container = document.getElementById(containerId);
    const infoEl = document.getElementById(infoId);
    const controlsEl = document.getElementById(controlsId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalItems === 0 || totalPages <= 1) {
        container.classList.add('hidden');
        if (infoEl) infoEl.innerHTML = '';
        if (controlsEl) controlsEl.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    if (infoEl) {
        infoEl.innerHTML = `แสดง <span class="font-bold text-slate-800">${startItem} - ${endItem}</span> จากทั้งหมด <span class="font-bold text-slate-800">${totalItems}</span> รายการ (หน้า <span class="font-bold text-indigo-600">${currentPage}</span> / ${totalPages})`;
    }

    if (!controlsEl) return;

    let buttonsHtml = '';

    // First page <<
    buttonsHtml += `
        <button onclick="${changePageFuncName}(1)" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าแรก">
            <i class="fa-solid fa-angles-left"></i>
        </button>
    `;

    // Prev page <
    buttonsHtml += `
        <button onclick="${changePageFuncName}(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าก่อนหน้า">
            <i class="fa-solid fa-angle-left mr-1"></i> ก่อนหน้า
        </button>
    `;

    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        buttonsHtml += `<button onclick="${changePageFuncName}(1)" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">1</button>`;
        if (startPage > 2) {
            buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
        }
    }

    for (let p = startPage; p <= endPage; p++) {
        if (p === currentPage) {
            buttonsHtml += `<button class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 cursor-default">${p}</button>`;
        } else {
            buttonsHtml += `<button onclick="${changePageFuncName}(${p})" class="px-3.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm">${p}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
        }
        buttonsHtml += `<button onclick="${changePageFuncName}(${totalPages})" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">${totalPages}</button>`;
    }

    // Next page >
    buttonsHtml += `
        <button onclick="${changePageFuncName}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าถัดไป">
            ถัดไป <i class="fa-solid fa-angle-right ml-1"></i>
        </button>
    `;

    // Last page >>
    buttonsHtml += `
        <button onclick="${changePageFuncName}(${totalPages})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าสุดท้าย">
            <i class="fa-solid fa-angles-right"></i>
        </button>
    `;

    controlsEl.innerHTML = buttonsHtml;
}

