        // ===== Purchasing Module Helper Functions =====
        let purchaseActiveTab = 'all'; // 'all' หรือ 'pending'
        let purchaseSearchQuery = '';
        let dashboardOrdersSearchQuery = '';
        let dashboardOrdersCurrentPage = 1;
        let poHistoryCurrentPage = 1;
        let receiveHistoryCurrentPage = 1;
        let transactionsCurrentPage = 1;
        let publicManualsCurrentPage = 1;
        let manageManualsCurrentPage = 1;
        let draftOrdersSearchQuery = '';
        let manageOrdersSearchQuery = '';
        let manageOrdersSupplierFilter = '';
        let purchaseHistorySearchQuery = '';
        let purchaseHistoryCategoryFilter = '';
        let purchaseHistoryGroupFilter = '';
        let receiveHistoryCategoryFilter = '';
        let receiveHistoryGroupFilter = '';
        let purchaseOverviewSearchQuery = '';
        let purchaseOverviewCategoryFilter = '';
        let purchaseOverviewGroupFilter = '';
        let purchaseOverviewSelectedMonths = [];
        let purchaseOverviewSelectedYears = [];
        let selectedVolatileProduct = '';
        let selectedVolatileSupplier = '';
        let transactions = [];

        function openPurchaseSubSection(key, title, iconClass, gradientClass) {
            const gridEl = document.getElementById('purchase-menu-grid');
            if (gridEl) gridEl.classList.add('hidden');
            
            const subContent = document.getElementById('purchase-sub-content');
            if (subContent) subContent.classList.remove('hidden');

            const iconBg = document.getElementById('sub-sec-icon-bg');
            if (iconBg) {
                iconBg.className = "w-12 h-12 rounded-xl text-white flex items-center justify-center bg-gradient-to-br " + gradientClass;
            }
            
            const icon = document.getElementById('sub-sec-icon');
            if (icon) {
                icon.className = "fa-solid text-xl " + iconClass;
            }

            const titleEl = document.getElementById('sub-sec-title');
            if (titleEl) titleEl.innerText = title;
            
            let desc = "";
            let htmlContent = "";
            if (key === 'receive') {
                desc = "โมดูลการตรวจรับสินค้าและตรวจสอบคุณภาพ";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Filter Tabs -->
                            <div class="flex bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
                                <button onclick="setPurchaseFilterTab('all')" id="tab-purchase-all" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/55">
                                    ทั้งหมด
                                </button>
                                <button onclick="setPurchaseFilterTab('pending')" id="tab-purchase-pending" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800">
                                    ค้างส่ง
                                </button>
                            </div>
                            <!-- Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handlePurchaseSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วย PO, PR, รหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4 text-center">วันที่สั่งสินค้า</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center">วันที่รับล่าสุด</th>
                                        <th class="p-4 text-center">จำนวนที่รับ</th>
                                        <th class="p-4 text-center">จำนวนค้างรับ</th>
                                        <th class="p-4 text-center rounded-tr-2xl">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="receiveTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    purchaseActiveTab = 'all';
                    purchaseSearchQuery = '';
                    renderReceiveTable();
                }, 50);

            } else if (key === 'dashboard-orders') {
                desc = "ค้นหาและวิเคราะห์รายการสั่งซื้อพร้อมระดับสถานะอย่างละเอียด";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-end gap-4">
                            <!-- Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleDashboardOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วย PO, PR, รหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4 text-center">วันที่สั่งสินค้า</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center rounded-tr-2xl">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody id="dashboardOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination Container -->
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mt-4">
                            <div id="dbOrdersPaginationInfo" class="text-xs text-slate-500 font-medium"></div>
                            <div id="dbOrdersPaginationControls" class="flex items-center gap-1"></div>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    dashboardOrdersSearchQuery = '';
                    dashboardOrdersCurrentPage = 1;
                    renderDashboardOrdersTable();
                }, 50);

            } else if (key === 'add-order') {
                desc = "สร้างเอกสารขอซื้อหรือสั่งซื้อสินค้า (PR/PO)";
                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Left: Buttons -->
                            <div class="flex items-center gap-3">
                                <button onclick="handleAddOrderDraft()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-plus"></i> เพิ่มรายการ
                                </button>
                                <button onclick="exportDraftOrdersToExcel()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
                                </button>
                            </div>
                            <!-- Right: Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleDraftOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส หรือชื่อสินค้า...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4">Supplier</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-center">หน่วย</th>
                                        <th class="p-4 text-center rounded-tr-2xl" style="width: 140px;">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="draftOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    draftOrdersSearchQuery = '';
                    renderDraftOrdersTable();
                }, 50);
            } else if (key === 'manage-orders') {
                desc = "ตรวจสอบความคืบหน้า อนุมัติ หรืออัปเดตใบสั่งซื้อ";

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Sub Header Control Row -->
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Left: Filter Dropdown -->
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <span class="text-xs font-semibold text-slate-500">กรองซัพพลายเออร์:</span>
                                <select id="manageOrdersSupplierFilterSelect" onchange="handleManageOrdersSupplierFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[200px]">
                                    <option value="">ทั้งหมด</option>
                                </select>
                            </div>
                            <!-- Right: Search Field -->
                            <div class="relative max-w-sm w-full md:w-80">
                                <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                </span>
                                <input type="text" onkeyup="handleManageOrdersSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส, ชื่อสินค้า หรือ PO/PR...">
                            </div>
                        </div>

                        <!-- Data Table Container -->
                        <div class="overflow-x-auto w-full border border-slate-150 rounded-2xl shadow-sm bg-white table-scroll">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        <th class="p-4">วันที่สั่งสินค้า</th>
                                        <th class="p-4">PO Number</th>
                                        <th class="p-4">PR Number</th>
                                        <th class="p-4">รหัสสินค้า</th>
                                        <th class="p-4">ชื่อสินค้า</th>
                                        <th class="p-4">Supplier</th>
                                        <th class="p-4 text-center">จำนวนที่สั่ง</th>
                                        <th class="p-4 text-right">ราคา/หน่วย</th>
                                        <th class="p-4 text-right">ราคารวม</th>
                                        <th class="p-4 text-center rounded-tr-2xl" style="width: 110px;">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody id="manageOrdersTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                                    <!-- Rendered dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                
                // Initialize the table body rendering
                setTimeout(() => {
                    manageOrdersSearchQuery = '';
                    manageOrdersSupplierFilter = '';
                    renderManageOrdersTable();
                }, 50);
            } else if (key === 'history') {
                desc = "ประวัติและรายการสั่งซื้อที่ทำเสร็จสิ้นแล้ว";
                
                const isAdmin = currentUser && currentUser.role === 'ADMIN';
                
                // Get unique categories and groups for filter dropdowns
                const products = db.products || [];
                const categories = [...new Set(products.map(p => p.category || 'ไม่ระบุ').filter(Boolean))].sort();
                const categoryOptions = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');

                const groups = [...new Set(products.map(p => p.group || 'ไม่ระบุ').filter(Boolean))].sort();
                const groupOptions = groups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Tabs for switching between Purchase Order History and Receive-in History -->
                        <div class="flex bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
                            <button onclick="setPurchaseHistoryTab('po-history')" id="tab-history-po" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/55">
                                ประวัติใบสั่งซื้อ (PO)
                            </button>
                            <button onclick="setPurchaseHistoryTab('receive-history')" id="tab-history-receive" class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800">
                                ประวัติการรับเข้าคลัง
                            </button>
                        </div>

                        <!-- Purchase Orders History View -->
                        <div id="view-history-po-section" class="space-y-6">
                            <!-- Search and Filter Row -->
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <!-- Left Filters -->
                                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-semibold text-slate-500">ประเภทอะไหล่:</span>
                                        <select onchange="handleHistoryCategoryFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                            <option value="">ทั้งหมด</option>
                                            ${categoryOptions}
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-semibold text-slate-500">กลุ่มสินค้า:</span>
                                        <select onchange="handleHistoryGroupFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                            <option value="">ทั้งหมด</option>
                                            ${groupOptions}
                                        </select>
                                    </div>
                                    <button onclick="exportPurchaseHistoryToExcel()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95 self-start">
                                         <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
                                     </button>
                                     ${isAdmin ? `
                                     <button onclick="deleteAllPurchaseHistory()" class="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95 self-start">
                                         <i class="fa-solid fa-trash-can"></i> ลบประวัติทั้งหมด
                                     </button>
                                     ` : ''}
                                </div>
                                <!-- Right Search -->
                                <div class="relative max-w-sm w-full lg:w-80">
                                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                    </span>
                                    <input type="text" onkeyup="handleHistorySearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหา PO, PR, รหัสสินค้า, ชื่อสินค้า...">
                                </div>
                            </div>

                            <!-- Cards Container -->
                            <div id="purchaseHistoryCardsContainer" class="space-y-4">
                                <!-- Cards rendered dynamically -->
                            </div>

                            <!-- Pagination for PO History -->
                            <div id="poHistoryPaginationContainer" class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mt-4 hidden">
                                <div id="poHistoryPaginationInfo" class="text-xs text-slate-500 font-medium"></div>
                                <div id="poHistoryPaginationControls" class="flex items-center gap-1"></div>
                            </div>
                        </div>

                        <!-- Receive-in History View -->
                        <div id="view-history-receive-section" class="space-y-6 hidden">
                            <!-- Search & Filter Row for Receiving -->
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <!-- Left Filters -->
                                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-semibold text-slate-500">ประเภทอะไหล่:</span>
                                        <select onchange="handleReceiveHistoryCategoryFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                            <option value="">ทั้งหมด</option>
                                            ${categoryOptions}
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-semibold text-slate-500">กลุ่มสินค้า:</span>
                                        <select onchange="handleReceiveHistoryGroupFilter(this.value)" class="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm min-w-[150px]">
                                            <option value="">ทั้งหมด</option>
                                            ${groupOptions}
                                        </select>
                                    </div>
                                    <button onclick="exportReceiveHistoryToExcel()" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95 self-start">
                                        <i class="fa-solid fa-file-excel"></i> ส่งออก Excel
                                    </button>
                                    ${isAdmin ? `
                                    <button onclick="deleteAllReceiveHistory()" class="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm hover:shadow-md active:scale-95 self-start">
                                        <i class="fa-solid fa-trash-can"></i> ลบประวัติทั้งหมด
                                    </button>
                                    ` : ''}
                                </div>
                                <!-- Right Search -->
                                <div class="relative max-w-sm w-full lg:w-80">
                                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                    </span>
                                    <input type="text" id="searchReceiveHistoryInput" onkeyup="handleReceiveHistorySearch()" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหา เลข PO, ซัพพลาย, รหัสใบรับ, ผู้รับ, หมายเหตุ...">
                                </div>
                            </div>

                            <!-- Receiving History Cards Container -->
                            <div id="receiveHistoryCardsContainer" class="space-y-4">
                                <!-- Cards rendered dynamically -->
                            </div>

                            <!-- Pagination for Receive History -->
                            <div id="receiveHistoryPaginationContainer" class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm mt-4 hidden">
                                <div id="receiveHistoryPaginationInfo" class="text-xs text-slate-500 font-medium"></div>
                                <div id="receiveHistoryPaginationControls" class="flex items-center gap-1"></div>
                            </div>
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    purchaseHistorySearchQuery = '';
                    purchaseHistoryCategoryFilter = '';
                    purchaseHistoryGroupFilter = '';
                    receiveHistoryCategoryFilter = '';
                    receiveHistoryGroupFilter = '';
                    setPurchaseHistoryTab('po-history');
                }, 50);
            } else if (key === 'overview') {
                desc = "ภาพรวมงบประมาณจัดซื้อและสถิติยอดซื้อ";
                
                const products = db.products || [];
                const categories = [...new Set(products.map(p => p.category || 'ไม่ระบุ').filter(Boolean))].sort();
                const categoryOptions = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');

                const groups = [...new Set(products.map(p => p.group || 'ไม่ระบุ').filter(Boolean))].sort();
                const groupOptions = groups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('');

                const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const monthButtons = monthNames.map((name, index) => {
                    const monthVal = String(index + 1).padStart(2, '0');
                    return `
                        <button onclick="toggleOverviewMonth('${monthVal}', this)" id="btn-overview-month-${monthVal}" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm">
                            ${name}
                        </button>
                    `;
                }).join('');

                // Get dynamic years from purchaseOrders
                const orders = db.purchaseOrders || [];
                const yearsList = [...new Set(orders.map(o => o.orderDate ? o.orderDate.split('-')[0] : '').filter(Boolean))].sort();
                if (yearsList.length === 0) {
                    yearsList.push(new Date().getFullYear().toString());
                }
                const yearButtons = yearsList.map(y => `
                    <button onclick="toggleOverviewYear('${y}', this)" id="btn-overview-year-${y}" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm">
                        ${y}
                    </button>
                `).join('');

                htmlContent = `
                    <div class="space-y-6">
                        <!-- Filters Header Card -->
                        <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                            <!-- Search, Category, Group -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">ค้นหาอะไหล่:</label>
                                    <div class="relative">
                                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs"></i>
                                        </span>
                                        <input type="text" id="overview-search-input" onkeyup="handleOverviewSearch(this.value)" class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 focus:outline-none transition shadow-sm" placeholder="ค้นหาด้วยรหัส หรือชื่อสินค้า...">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">ประเภทอะไหล่:</label>
                                    <select onchange="handleOverviewCategory(this.value)" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm">
                                        <option value="">ทั้งหมด</option>
                                        ${categoryOptions}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">กลุ่มสินค้า:</label>
                                    <select onchange="handleOverviewGroup(this.value)" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm">
                                        <option value="">ทั้งหมด</option>
                                        ${groupOptions}
                                    </select>
                                </div>
                            </div>

                            <!-- Months Selection -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="text-[11px] font-semibold text-slate-500">เลือกเดือน (เลือกได้หลายเดือน):</span>
                                    <div class="space-x-2">
                                        <button onclick="selectOverviewAllMonths(true)" class="text-[10px] text-blue-600 hover:underline font-bold">เลือกทั้งหมด</button>
                                        <span class="text-slate-300">|</span>
                                        <button onclick="selectOverviewAllMonths(false)" class="text-[10px] text-slate-500 hover:underline font-bold">ล้างทั้งหมด</button>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${monthButtons}
                                </div>
                            </div>

                            <!-- Years Selection -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="text-[11px] font-semibold text-slate-500">เลือกปี (เลือกได้หลายปี):</span>
                                    <div class="space-x-2">
                                        <button onclick="selectOverviewAllYears(true)" class="text-[10px] text-blue-600 hover:underline font-bold">เลือกทั้งหมด</button>
                                        <span class="text-slate-300">|</span>
                                        <button onclick="selectOverviewAllYears(false)" class="text-[10px] text-slate-500 hover:underline font-bold">ล้างทั้งหมด</button>
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${yearButtons}
                                </div>
                            </div>
                        </div>

                        <!-- CORE STAT CARDS -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="overview-stat-cards">
                            <!-- Populated by JS -->
                        </div>

                        <!-- LINE CHART & MONTHLY COMPARISON CARD -->
                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <!-- SVG Line Chart (Left 2 cols) -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm xl:col-span-2 space-y-4">
                                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <i class="fa-solid fa-chart-line text-blue-500"></i> กราฟเส้นเปรียบเทียบมูลค่าการสั่งซื้อรายเดือน
                                </h3>
                                <div id="overview-chart-container" class="relative w-full h-80 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                                    <!-- Rendered dynamically as SVG -->
                                </div>
                            </div>

                            <!-- Monthly Comparisons Table (Right 1 col) -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <i class="fa-solid fa-calendar-days text-purple-500"></i> แนวโน้มเปรียบเทียบรายเดือน
                                </h3>
                                <div class="overflow-y-auto max-h-[320px] pr-1 scrollbar-thin space-y-3" id="overview-monthly-comparison-list">
                                    <!-- Rendered dynamically as cards -->
                                </div>
                            </div>
                        </div>

                        <!-- PRODUCT GROUP ANALYSIS SECTION -->
                        <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                            <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <i class="fa-solid fa-layer-group text-indigo-500"></i> วิเคราะห์และเปรียบเทียบยอดจัดซื้อตามกลุ่มสินค้า (Product Group)
                            </h3>
                            <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white table-scroll">
                                <table class="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50 border-b border-slate-150 font-bold text-slate-600">
                                            <th class="p-3">กลุ่มสินค้า</th>
                                            <th class="p-3 text-center">จำนวนที่สั่ง (รายการ)</th>
                                            <th class="p-3 text-right">ยอดสั่งซื้อรวม</th>
                                            <th class="p-3 text-right">ยอดได้รับจริงรวม</th>
                                            <th class="p-3 text-center" style="width: 120px;">สัดส่วนสั่งซื้อ (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="overview-group-analysis-tbody" class="divide-y divide-slate-100">
                                        <!-- Rendered dynamically -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- PRODUCT & SUPPLIER PRICE ANALYTICS SECTION -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Product Price Analysis -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <div class="flex items-center justify-between gap-2">
                                    <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <i class="fa-solid fa-tags text-amber-500"></i> วิเคราะห์ความเคลื่อนไหวราคาอะไหล่
                                    </h3>
                                    <!-- Selector to drill down -->
                                    <select id="overview-drill-product-select" onchange="drillProductPriceTrend(this.value)" class="px-2 py-1 text-[10px] border border-slate-200 rounded-lg max-w-[180px] bg-white focus:outline-none shadow-sm">
                                        <option value="">เลือกสินค้าเพื่อวิเคราะห์...</option>
                                    </select>
                                </div>

                                <!-- Drill Down Timeline container -->
                                <div id="product-drilldown-timeline" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 max-h-48 overflow-y-auto">
                                    <!-- Timeline rows rendered dynamically -->
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <!-- Top 10 Price Down -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-down-long"></i> 10 อันดับ ราคาลงมากสุด
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">สินค้า</th>
                                                        <th class="p-2 text-right">ลดลง</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-product-downs">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <!-- Top 10 Price Up -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-rose-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-up-long"></i> 10 อันดับ ราคาขึ้นมากสุด
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">สินค้า</th>
                                                        <th class="p-2 text-right">เพิ่มขึ้น</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-product-ups">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Supplier Price Analysis -->
                            <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                <div class="flex items-center justify-between gap-2">
                                    <h3 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                        <i class="fa-solid fa-handshake text-indigo-500"></i> วิเคราะห์ความผันผวนราคาคู่ค้า (Supplier)
                                    </h3>
                                    <!-- Selector to drill down -->
                                    <select id="overview-drill-supplier-select" onchange="drillSupplierPriceTrend(this.value)" class="px-2 py-1 text-[10px] border border-slate-200 rounded-lg max-w-[180px] bg-white focus:outline-none shadow-sm">
                                        <option value="">เลือก Supplier...</option>
                                    </select>
                                </div>

                                <!-- Drill Down Timeline container -->
                                <div id="supplier-drilldown-timeline" class="hidden bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 max-h-48 overflow-y-auto">
                                    <!-- Timeline rows rendered dynamically -->
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <!-- Top 10 Supplier Price Down -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-down-long"></i> 10 อันดับ Supplier ราคาลดลง
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">Supplier</th>
                                                        <th class="p-2 text-right">ลดลงเฉลี่ย</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-supplier-downs">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <!-- Top 10 Supplier Price Up -->
                                    <div class="space-y-2">
                                        <h4 class="text-xs font-bold text-rose-600 flex items-center gap-1">
                                            <i class="fa-solid fa-arrow-up-long"></i> 10 อันดับ Supplier ราคาเพิ่มขึ้น
                                        </h4>
                                        <div class="overflow-x-auto border border-slate-100 rounded-xl bg-white max-h-60 overflow-y-auto table-scroll">
                                            <table class="w-full text-left text-[10px] border-collapse">
                                                <thead>
                                                    <tr class="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                                                        <th class="p-2">Supplier</th>
                                                        <th class="p-2 text-right">เพิ่มเฉลี่ย</th>
                                                        <th class="p-2 text-right">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="top-supplier-ups">
                                                    <!-- Dynamic rows -->
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                setTimeout(() => {
                    purchaseOverviewSearchQuery = '';
                    purchaseOverviewCategoryFilter = '';
                    purchaseOverviewGroupFilter = '';
                    purchaseOverviewSelectedMonths = []; // empty = all
                    purchaseOverviewSelectedYears = []; // empty = all
                    
                    // Highlight initially all months/years buttons
                    selectOverviewAllMonths(true);
                    selectOverviewAllYears(true);
                    
                    renderPurchaseOverviewDashboard();
                }, 50);
            }

            const subtitleEl = document.getElementById('sub-sec-subtitle');
            if (subtitleEl) subtitleEl.innerText = desc;
            
            const bodyEl = document.getElementById('sub-sec-body');
            if (bodyEl) {
                if (key === 'receive' || key === 'dashboard-orders' || key === 'add-order' || key === 'manage-orders' || key === 'history') {
                    bodyEl.className = "w-full text-left text-slate-700";
                } else {
                    bodyEl.className = "flex flex-col items-center justify-center py-12 text-center text-slate-400";
                }
                bodyEl.innerHTML = htmlContent;
            }
        }

        function closePurchaseSubSection() {
            const subContent = document.getElementById('purchase-sub-content');
            if (subContent) subContent.classList.add('hidden');
            
            const gridEl = document.getElementById('purchase-menu-grid');
            if (gridEl) gridEl.classList.remove('hidden');

            const bodyEl = document.getElementById('sub-sec-body');
            if (bodyEl) {
                bodyEl.className = "flex flex-col items-center justify-center py-12 text-center text-slate-400";
                bodyEl.innerHTML = `
                    <div class="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 text-3xl mb-4 border border-dashed border-slate-200">
                        <i class="fa-solid fa-helmet-safety"></i>
                    </div>
                    <h4 class="text-slate-700 font-bold text-sm">ระบบส่วนงานนี้อยู่ระหว่างการเตรียมความพร้อม</h4>
                    <p class="text-slate-400 text-xs mt-1 max-w-sm leading-relaxed">โมดูลนี้ได้รับการเชื่อมโยงแล้ว ทีมพัฒนากำลังดำเนินการติดตั้งฐานข้อมูลและหน้าอินเตอร์เฟสสำหรับการใช้งานจริง</p>
                `;
            }
        }

        function setPurchaseFilterTab(tab) {
            purchaseActiveTab = tab;
            const btnAll = document.getElementById('tab-purchase-all');
            const btnPending = document.getElementById('tab-purchase-pending');
            if (tab === 'all') {
                if (btnAll) btnAll.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/50";
                if (btnPending) btnPending.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
            } else {
                if (btnPending) btnPending.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/50";
                if (btnAll) btnAll.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
            }
            renderReceiveTable();
        }

        function handlePurchaseSearch(val) {
            purchaseSearchQuery = val.trim().toLowerCase();
            renderReceiveTable();
        }

        function handleDashboardOrdersSearch(val) {
            dashboardOrdersSearchQuery = val.trim().toLowerCase();
            dashboardOrdersCurrentPage = 1;
            renderDashboardOrdersTable();
        }

        function renderReceiveTable() {
            const tableBody = document.getElementById('receiveTableBody');
            if (!tableBody) return;

            const isAdmin = currentUser && currentUser.role === 'ADMIN';
            const orders = db.purchaseOrders || [];
            
            // Filter: show only items with status "สั่งแล้ว" or "ค้างส่ง"
            let filtered = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ค้างส่ง");

            // Sort by orderDate descending, then by poNumber descending (latest first)
            filtered.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            // Filter by active tab: if "pending" (ค้างส่ง), show items where status is "ค้างส่ง"
            if (purchaseActiveTab === 'pending') {
                filtered = filtered.filter(o => o.status === "ค้างส่ง");
            }

            // Filter by search query
            if (purchaseSearchQuery) {
                filtered = filtered.filter(o => 
                    String(o.poNumber || '').toLowerCase().includes(purchaseSearchQuery) ||
                    String(o.prNumber || '').toLowerCase().includes(purchaseSearchQuery) ||
                    String(o.productId || '').toLowerCase().includes(purchaseSearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(purchaseSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-boxes-packing text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่พบรายการค้างรับสินค้า</p>
                                <p class="text-xs text-slate-400 mt-0.5">รายการสั่งซื้อทั้งหมดได้รับการจัดส่งครบถ้วน หรือไม่ตรงกับเงื่อนไขการค้นหา</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = '';
            filtered.forEach(o => {
                const pendingQty = o.orderedQty - o.receivedQty;
                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-bold text-slate-800 font-mono tracking-wider">${escapeHTML(o.poNumber)}</td>
                        <td class="p-4 text-slate-600 font-mono">${escapeHTML(o.prNumber)}</td>
                        <td class="p-4 text-slate-500 font-mono text-[11px]">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(formatDateTimeThai(o.orderDate))}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center text-slate-500">${o.lastReceivedDate ? escapeHTML(formatDateTimeThai(o.lastReceivedDate)) : '-'}</td>
                        <td class="p-4 text-center font-bold text-emerald-600">${o.receivedQty}</td>
                        <td class="p-4 text-center font-extrabold text-rose-600 bg-rose-50/30">${pendingQty}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="handleReceiveGoods('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition shadow-sm hover:shadow-md active:scale-95">
                                    <i class="fa-solid fa-square-check"></i> รับสินค้า
                                </button>
                                ${isAdmin ? `
                                <button onclick="deleteActivePurchaseOrder('${escapeForJS(o.poNumber)}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold rounded-xl text-[11px] transition border border-rose-100 hover:border-rose-600 shadow-sm active:scale-95">
                                    <i class="fa-solid fa-trash-can"></i> ลบ
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });
        }

        function renderDashboardOrdersTable() {
            const tableBody = document.getElementById('dashboardOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            let filtered = [...orders];

            // Sort by orderDate descending, then by poNumber descending (latest first)
            filtered.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            // Filter by search query
            if (dashboardOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    String(o.poNumber || '').toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    String(o.prNumber || '').toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    String(o.productId || '').toLowerCase().includes(dashboardOrdersSearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(dashboardOrdersSearchQuery)
                );
            }

            const infoEl = document.getElementById('dbOrdersPaginationInfo');
            const controlsEl = document.getElementById('dbOrdersPaginationControls');

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-receipt text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่พบข้อมูลคำสั่งซื้อ</p>
                                <p class="text-xs text-slate-400 mt-0.5">กรุณาปรับคำค้นหาหรือเพิ่มคำสั่งซื้อเข้าระบบ</p>
                            </div>
                        </td>
                    </tr>
                `;
                if (infoEl) infoEl.innerText = "ไม่พบรายการคำสั่งซื้อ";
                if (controlsEl) controlsEl.innerHTML = '';
                return;
            }

            // Pagination calculation
            const pageSize = 20;
            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / pageSize);

            if (dashboardOrdersCurrentPage > totalPages) dashboardOrdersCurrentPage = totalPages;
            if (dashboardOrdersCurrentPage < 1) dashboardOrdersCurrentPage = 1;

            const startIndex = (dashboardOrdersCurrentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageOrders = filtered.slice(startIndex, endIndex);

            tableBody.innerHTML = '';
            pageOrders.forEach(o => {
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (o.status === 'รออนุมัติ') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                else if (o.status === 'สั่งแล้ว') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                else if (o.status === 'ค้างส่ง') badgeColor = 'bg-red-50 text-red-700 border border-red-200';
                else if (o.status === 'ได้รับครบ') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                const rowHtml = `
                    <tr onclick="showDashboardOrderDetailModal('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <td class="p-4 font-bold text-slate-800 font-mono tracking-wider">${escapeHTML(o.poNumber)}</td>
                        <td class="p-4 text-slate-600 font-mono">${escapeHTML(o.prNumber)}</td>
                        <td class="p-4 text-slate-500 font-mono text-[11px]">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(formatDateTimeThai(o.orderDate))}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center">
                            <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase ${badgeColor}">
                                ${escapeHTML(o.status)}
                            </span>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });

            renderDashboardOrdersPagination(totalItems, dashboardOrdersCurrentPage, totalPages);
        }

        function renderDashboardOrdersPagination(totalItems, currentPage, totalPages) {
            const infoEl = document.getElementById('dbOrdersPaginationInfo');
            const controlsEl = document.getElementById('dbOrdersPaginationControls');
            if (!infoEl || !controlsEl) return;

            if (totalItems === 0) {
                infoEl.innerText = "ไม่พบรายการคำสั่งซื้อ";
                controlsEl.innerHTML = '';
                return;
            }

            const pageSize = 20;
            const startItem = (currentPage - 1) * pageSize + 1;
            const endItem = Math.min(currentPage * pageSize, totalItems);
            infoEl.innerHTML = `แสดง <span class="font-bold text-slate-800">${startItem} - ${endItem}</span> จากทั้งหมด <span class="font-bold text-slate-800">${totalItems}</span> รายการ (หน้า <span class="font-bold text-indigo-600">${currentPage}</span> / ${totalPages})`;

            let buttonsHtml = '';

            // First page <<
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(1)" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าแรก">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
            `;

            // Prev page <
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าก่อนหน้า">
                    <i class="fa-solid fa-angle-left mr-1"></i> ก่อนหน้า
                </button>
            `;

            // Page numbers
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

            if (startPage > 1) {
                buttonsHtml += `<button onclick="changeDashboardOrdersPage(1)" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">1</button>`;
                if (startPage > 2) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
            }

            for (let p = startPage; p <= endPage; p++) {
                if (p === currentPage) {
                    buttonsHtml += `<button class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-500/20 cursor-default">${p}</button>`;
                } else {
                    buttonsHtml += `<button onclick="changeDashboardOrdersPage(${p})" class="px-3.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm">${p}</button>`;
                }
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    buttonsHtml += `<span class="px-1 text-gray-400 text-xs font-bold">...</span>`;
                }
                buttonsHtml += `<button onclick="changeDashboardOrdersPage(${totalPages})" class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm">${totalPages}</button>`;
            }

            // Next page >
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าถัดไป">
                    ถัดไป <i class="fa-solid fa-angle-right ml-1"></i>
                </button>
            `;

            // Last page >>
            buttonsHtml += `
                <button onclick="changeDashboardOrdersPage(${totalPages})" ${currentPage === totalPages ? 'disabled class="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed border border-gray-200"' : 'class="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"'} title="หน้าสุดท้าย">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            `;

            controlsEl.innerHTML = buttonsHtml;
        }

        window.changeDashboardOrdersPage = function(p) {
            dashboardOrdersCurrentPage = p;
            renderDashboardOrdersTable();
        };

        window.showDashboardOrderDetailModal = function(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => String(o.poNumber).trim() === String(poNumber).trim() && String(o.productId).trim() === String(productId).trim());
            if (!order) return;

            const prod = db.products ? db.products.find(p => String(p.id).trim() === String(productId).trim()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';
            const supplier = order.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
            
            const pendingQty = Math.max(0, order.orderedQty - order.receivedQty);
            const hasPending = pendingQty > 0;
            
            let statusColor = 'text-slate-600 bg-slate-100';
            if (order.status === 'รออนุมัติ') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
            else if (order.status === 'สั่งแล้ว') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
            else if (order.status === 'ค้างส่ง') statusColor = 'text-red-700 bg-red-50 border-red-200';
            else if (order.status === 'ได้รับครบ') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

            Swal.fire({
                title: '<i class="fa-solid fa-circle-info text-indigo-600 mr-2"></i>รายละเอียดคำสั่งซื้อ',
                html: `
                    <div class="space-y-4 text-left text-xs text-slate-700">
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                            <h4 class="font-bold text-slate-800 text-sm">${escapeHTML(order.productName)}</h4>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                                <div><span class="text-slate-400">รหัสสินค้า:</span> <span class="font-bold font-mono text-slate-700">${escapeHTML(order.productId)}</span></div>
                                <div><span class="text-slate-400">หน่วยนับ:</span> <span class="font-bold text-slate-700">${escapeHTML(unit)}</span></div>
                                <div class="col-span-2"><span class="text-slate-400">ซัพพลายเออร์ (Supplier):</span> <span class="font-bold text-slate-800 text-xs">${escapeHTML(supplier)}</span></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 text-center">
                            <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">เลขที่ PO</span>
                                <span class="font-bold font-mono text-slate-700 text-xs">${escapeHTML(order.poNumber.startsWith('PO-DRF-') ? 'ดราฟต์' : order.poNumber)}</span>
                            </div>
                            <div class="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">เลขที่ PR</span>
                                <span class="font-bold font-mono text-slate-700 text-xs">${escapeHTML(order.prNumber === 'PR-DRAFT' ? 'ดราฟต์' : (order.prNumber || '-'))}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2.5 text-center">
                            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                <span class="text-[9px] text-slate-400 font-semibold uppercase block">จำนวนที่สั่ง</span>
                                <span class="text-sm font-extrabold text-slate-800">${order.orderedQty} ${escapeHTML(unit)}</span>
                            </div>
                            <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                <span class="text-[9px] text-emerald-500 font-semibold uppercase block">รับเข้าแล้ว</span>
                                <span class="text-sm font-extrabold text-emerald-600">${order.receivedQty} ${escapeHTML(unit)}</span>
                            </div>
                            <div class="${hasPending ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-200'} p-3 rounded-xl">
                                <span class="text-[9px] ${hasPending ? 'text-rose-500' : 'text-slate-400'} font-semibold uppercase block">ค้างรับ</span>
                                <span class="text-sm font-extrabold ${hasPending ? 'text-rose-600' : 'text-slate-500'}">${pendingQty} ${escapeHTML(unit)}</span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
                            <span class="text-slate-400 font-semibold">สถานะรายการ:</span>
                            <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase border ${statusColor}">
                                ${escapeHTML(order.status)}
                            </span>
                        </div>
                    </div>
                `,
                confirmButtonText: 'ปิดหน้าต่าง',
                confirmButtonColor: '#4f46e5',
                customClass: {
                    popup: 'rounded-2xl w-full max-w-sm',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                }
            });
        }

        function handleReceiveGoods(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o =>
                String(o.poNumber).trim() === String(poNumber).trim() &&
                String(o.productId).trim() === String(productId).trim()
            );
            if (!order) {
                showToast("ไม่พบรายการใบสั่งซื้อนี้", "error");
                return;
            }

            const pendingQty = order.orderedQty - order.receivedQty;
            const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(order.productId).trim().toLowerCase()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';
            const supplier = order.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

            const unitCost = parseFloat(order.unitCost) || 0;
            const totalCost = parseFloat(order.totalCost) || (order.orderedQty * unitCost);
            const formattedUnitCost = '฿' + unitCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
            const formattedTotalCost = '฿' + totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

            Swal.fire({
                title: '<i class="fa-solid fa-boxes-packing text-emerald-500 mr-2"></i>บันทึกการรับสินค้าเข้าคลัง',
                html: `
                    <div class="space-y-4 text-left text-xs">
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 flex gap-2.5 items-center mb-3">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-receipt"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] text-gray-400">เลขที่ใบสั่งซื้อ (PO)</p>
                                <p class="font-mono font-bold text-slate-700 truncate">${escapeHTML(order.poNumber)} (${escapeHTML(order.prNumber)})</p>
                            </div>
                        </div>
                        <div class="bg-slate-50 p-3 rounded-xl border border-gray-150 mb-3 space-y-2">
                            <div>
                                <p class="text-[10px] text-gray-400">รายการอะไหล่</p>
                                <p class="font-bold text-slate-700 mt-0.5">${escapeHTML(order.productName)}</p>
                                <p class="text-[10px] text-slate-500 font-mono">รหัส: ${escapeHTML(order.productId)}</p>
                            </div>
                            <div class="pt-2 border-t border-slate-200/60">
                                <p class="text-[10px] text-gray-400">ซัพพลายเออร์ที่ซื้อ</p>
                                <p class="font-bold text-slate-700 mt-0.5">${escapeHTML(supplier)}</p>
                            </div>
                            <div class="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2">
                                <div>
                                    <p class="text-[10px] text-gray-400">ราคาต่อชิ้น</p>
                                    <p class="font-bold text-slate-700 font-mono mt-0.5">${formattedUnitCost}</p>
                                </div>
                                <div>
                                    <p class="text-[10px] text-gray-400">ราคารวม</p>
                                    <p class="font-bold text-slate-700 font-mono mt-0.5">${formattedTotalCost}</p>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-3 text-center mb-4">
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-slate-400 font-semibold uppercase">จำนวนที่สั่ง</p>
                                <p class="text-base font-extrabold text-slate-700 mt-0.5">${order.orderedQty}</p>
                            </div>
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-emerald-500 font-semibold uppercase">รับเข้าแล้ว</p>
                                <p class="text-base font-extrabold text-emerald-600 mt-0.5">${order.receivedQty}</p>
                            </div>
                            <div class="bg-white border border-slate-200 p-2.5 rounded-xl">
                                <p class="text-[9px] text-rose-500 font-semibold uppercase">ยอดค้างรับ</p>
                                <p class="text-base font-extrabold text-rose-600 mt-0.5">${pendingQty}</p>
                            </div>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">จำนวนสินค้าที่ได้รับครั้งนี้ (${escapeHTML(unit)})</label>
                            <input type="number" id="swal-receive-qty" min="1" max="${pendingQty}" value="" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุจำนวน${escapeHTML(unit)}ที่ส่งมอบ">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกการรับเข้า',
                confirmButtonColor: '#10b981',
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
                preConfirm: () => {
                    const receiveInput = document.getElementById('swal-receive-qty');
                    const receiveVal = parseFloat(receiveInput.value);
                    if (isNaN(receiveVal) || receiveVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง (มากกว่า 0)');
                        return false;
                    }
                    if (receiveVal > pendingQty) {
                        Swal.showValidationMessage(`จำนวนรับเข้าเกินยอดค้างส่ง (${pendingQty} ${unit})`);
                        return false;
                    }
                    return receiveVal;
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const receivedAmount = result.value;
                    
                    showLoading("กำลังบันทึกการรับสินค้า...");
                    try {
                        const payload = {
                            poNumber: poNumber,
                            productId: productId,
                            receivedAmount: receivedAmount,
                            requester: currentUser ? currentUser.fullName : "เจ้าหน้าที่สโตว์",
                            department: currentUser ? currentUser.department : "จัดซื้อ"
                        };
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'receivePurchaseGoods', payload: payload })
                        });
                        const resultData = await res.json();
                        if (resultData.status === 'success') {
                            showToast(`บันทึกรับสินค้าสำเร็จ +${receivedAmount} ${unit}!`, 'success');
                            await fetchData(true); // force refresh database
                            
                            // Re-render current view depending on which element is open
                            const receiveTableBody = document.getElementById('receiveTableBody');
                            if (receiveTableBody) {
                                renderReceiveTable();
                            }
                            const dashboardOrdersTableBody = document.getElementById('dashboardOrdersTableBody');
                            if (dashboardOrdersTableBody) {
                                renderDashboardOrdersTable();
                            }
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resultData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function deleteActivePurchaseOrder(poNumber) {
            if (!currentUser || currentUser.role !== 'ADMIN') {
                showToast("คุณไม่มีสิทธิ์ทำรายการนี้", "error");
                return;
            }

            confirmAction(`คุณต้องการลบรายการสั่งซื้อเลขที่ "${poNumber}" ใช่หรือไม่?\nการดำเนินการนี้จะลบรายการสั่งซื้อออกจากระบบอย่างถาวรและไม่สามารถย้อนกลับได้`, async () => {
                showLoading("กำลังลบรายการสั่งซื้อ...");
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'deletePurchaseOrderActive',
                            payload: {
                                requesterEmail: currentUser.email,
                                poNumber: poNumber
                            }
                        })
                    });
                    const resData = await res.json();
                    hideLoading();
                    
                    if (resData.status === 'success') {
                        showToast("ลบรายการสั่งซื้อสำเร็จ", "success");
                        await fetchData(true); // force refresh database
                        
                        // Re-render views
                        const receiveTableBody = document.getElementById('receiveTableBody');
                        if (receiveTableBody) {
                            renderReceiveTable();
                        }
                        const dashboardOrdersTableBody = document.getElementById('dashboardOrdersTableBody');
                        if (dashboardOrdersTableBody) {
                            renderDashboardOrdersTable();
                        }
                    } else {
                        showToast(resData.message || "เกิดข้อผิดพลาดในการลบรายการสั่งซื้อ", "error");
                    }
                } catch (err) {
                    hideLoading();
                    console.error(err);
                    showToast("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว", "error");
                }
            });
        }

        function handleDraftOrdersSearch(val) {
            draftOrdersSearchQuery = val.trim().toLowerCase();
            renderDraftOrdersTable();
        }

        function renderDraftOrdersTable() {
            const tableBody = document.getElementById('draftOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            let filtered = orders.filter(o => o.status === "เตรียมสั่ง");

            // Sort by poNumber descending (latest drafts first)
            filtered.sort((a, b) => {
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            if (draftOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    String(o.productId || '').toLowerCase().includes(draftOrdersSearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(draftOrdersSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-file-circle-plus text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่มีรายการเตรียมสั่งซื้อ</p>
                                <p class="text-xs text-slate-400 mt-0.5">คลิกที่ปุ่ม "เพิ่มรายการ" เพื่อเริ่มบันทึกอะไหล่ที่ต้องการขอสั่งซื้อ</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = '';
            filtered.forEach(o => {
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const unit = prod ? prod.unit : 'ชิ้น';
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-mono text-[11px] text-slate-500">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-slate-600">${escapeHTML(supplier)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-center text-slate-500">${escapeHTML(unit)}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="handleEditOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition" title="แก้ไขจำนวน">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="handleDeleteOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition" title="ลบรายการ">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            });
        }

        let currentSelectedSwalProduct = null;

        window.onSwalProductSearchInput = function(val) {
            const resultsDiv = document.getElementById('swal-prod-results');
            if (!resultsDiv) return;

            const q = val.trim().toLowerCase();
            if (!q) {
                resultsDiv.classList.add('hidden');
                resultsDiv.innerHTML = '';
                return;
            }

            const products = db.products || [];
            const matches = products.filter(p => {
                const isCancelled = p.note && (p.note.trim() === 'ยกเลิกใช้' || p.note.includes('ยกเลิกใช้'));
                if (isCancelled) return false;

                const idStr = String(p.id || '').toLowerCase();
                const nameStr = String(p.name || '').toLowerCase();
                return idStr.includes(q) || nameStr.includes(q);
            }).slice(0, 8);

            if (matches.length === 0) {
                resultsDiv.classList.remove('hidden');
                resultsDiv.innerHTML = `<div class="p-3 text-center text-slate-400 text-xs">ไม่พบอะไหล่ที่ตรงกัน</div>`;
                return;
            }

            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = matches.map(p => `
                <div onclick="selectSwalProduct('${escapeForJS(String(p.id))}')" class="p-2.5 hover:bg-slate-50 cursor-pointer transition text-xs flex flex-col text-left">
                    <div class="font-bold text-slate-700">${escapeHTML(String(p.name))}</div>
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${escapeHTML(String(p.id))}</div>
                </div>
            `).join('');
        };

        window.selectSwalProduct = function(productId) {
            const products = db.products || [];
            const prod = products.find(p => String(p.id).trim() === String(productId).trim());
            if (!prod) return;

            currentSelectedSwalProduct = prod;

            const infoDiv = document.getElementById('swal-selected-prod-info');
            if (infoDiv) infoDiv.classList.remove('hidden');

            const infoId = document.getElementById('info-p-id');
            const infoName = document.getElementById('info-p-name');
            const infoUnit = document.getElementById('info-p-unit');
            const infoSupplier = document.getElementById('info-p-supplier');

            if (infoId) infoId.innerText = String(prod.id);
            if (infoName) infoName.innerText = String(prod.name);
            if (infoUnit) infoUnit.innerText = String(prod.unit || 'ชิ้น');
            if (infoSupplier) infoSupplier.innerText = String(prod.supplier || 'ไม่ระบุ');

            const swalOrderUnit = document.getElementById('swal-order-unit');
            if (swalOrderUnit) swalOrderUnit.innerText = String(prod.unit || 'ชิ้น');

            const qtyInput = document.getElementById('swal-order-qty');
            if (qtyInput) qtyInput.placeholder = `ระบุจำนวน${prod.unit || 'ชิ้น'}`;

            const searchInput = document.getElementById('swal-prod-search');
            if (searchInput) searchInput.value = String(prod.name);

            const resultsDiv = document.getElementById('swal-prod-results');
            if (resultsDiv) {
                resultsDiv.classList.add('hidden');
                resultsDiv.innerHTML = '';
            }
        };

        function handleAddOrderDraft() {
            Swal.fire({
                title: '<i class="fa-solid fa-file-circle-plus text-blue-600 mr-2"></i>เพิ่มรายการเตรียมสั่งซื้อ',
                html: `
                    <div class="space-y-3 text-left text-xs">
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5 text-xs">ค้นหาอะไหล่</label>
                            <input type="text" id="swal-prod-search" oninput="onSwalProductSearchInput(this.value)" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="พิมพ์รหัส หรือชื่อสินค้าเพื่อค้นหา...">
                            <div id="swal-prod-results" class="border border-slate-200 rounded-xl overflow-hidden mt-1.5 hidden max-h-40 overflow-y-auto bg-white shadow-lg text-left divide-y divide-slate-100 z-50 relative"></div>
                        </div>

                        <div id="swal-selected-prod-info" class="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-3 hidden text-left text-[11px] text-slate-600">
                            <p class="font-bold text-slate-800 mb-1 text-[11px]">อะไหล่ที่เลือก:</p>
                            <div class="space-y-1">
                                <div><span class="text-slate-400">รหัสสินค้า:</span> <span id="info-p-id" class="font-bold font-mono text-slate-700"></span></div>
                                <div><span class="text-slate-400">ชื่อสินค้า:</span> <span id="info-p-name" class="font-bold text-slate-700"></span></div>
                                <div><span class="text-slate-400">ซัพพลายเออร์เดิม:</span> <span id="info-p-supplier" class="font-bold text-amber-700"></span></div>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5 text-xs">จำนวนที่ต้องการสั่งซื้อ (<span id="swal-order-unit">ชิ้น</span>)</label>
                            <input type="number" id="swal-order-qty" min="1" value="1" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุจำนวนชิ้น">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกรายการ',
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
                    currentSelectedSwalProduct = null;
                    const swalOrderUnit = document.getElementById('swal-order-unit');
                    if (swalOrderUnit) swalOrderUnit.innerText = 'ชิ้น';
                    const qtyInput = document.getElementById('swal-order-qty');
                    if (qtyInput) qtyInput.placeholder = 'ระบุจำนวนชิ้น';
                },
                preConfirm: () => {
                    if (!currentSelectedSwalProduct) {
                        Swal.showValidationMessage('กรุณาค้นหาและเลือกอะไหล่ก่อน');
                        return false;
                    }
                    const qtyInput = document.getElementById('swal-order-qty');
                    const qtyVal = parseFloat(qtyInput.value);
                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง (มากกว่า 0)');
                        return false;
                    }
                    return {
                        productId: currentSelectedSwalProduct.id,
                        productName: currentSelectedSwalProduct.name,
                        orderedQty: qtyVal
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const data = result.value;
                    showLoading("กำลังเพิ่มรายการเตรียมสั่งซื้อ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'addPurchaseOrderDraft', payload: data })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("เพิ่มรายการเตรียมสั่งซื้อสำเร็จ!", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleEditOrderDraft(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => poNumber ? o.poNumber === poNumber : (o.productId === productId && o.status === "เตรียมสั่ง"));
            if (!order) return;

            const prod = db.products ? db.products.find(p => String(p.id).trim() === String(order.productId).trim()) : null;
            const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';

            Swal.fire({
                title: '<i class="fa-solid fa-pen-to-square text-blue-600 mr-2"></i>แก้ไขจำนวนสั่งซื้อ',
                html: `
                    <div class="text-left text-xs space-y-2">
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                            <p class="font-bold text-slate-800">${escapeHTML(order.productName)}</p>
                            <p class="text-[10px] text-slate-400 font-mono mt-0.5">รหัสสินค้า: ${escapeHTML(order.productId)}</p>
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-600 mb-1.5">จำนวนที่สั่งใหม่ (${escapeHTML(unit)})</label>
                            <input type="number" id="swal-edit-qty" min="1" value="${order.orderedQty}" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกแก้ไข',
                confirmButtonColor: '#2563eb',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: () => {
                    const qtyInput = document.getElementById('swal-edit-qty');
                    const qtyVal = parseFloat(qtyInput.value);
                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่ถูกต้อง');
                        return false;
                    }
                    return qtyVal;
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const qtyVal = result.value;
                    showLoading("กำลังแก้ไขรายการ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'editPurchaseOrderDraft', payload: { poNumber: poNumber, productId: productId, orderedQty: qtyVal } })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("แก้ไขจำนวนสั่งซื้อสำเร็จ", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้", "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleDeleteOrderDraft(poNumber, productId) {
            Swal.fire({
                title: 'ยืนยันการลบรายการ?',
                text: "คุณแน่ใจว่าต้องการลบรายการเตรียมสั่งซื้อนี้ออกจากฐานข้อมูล?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ยืนยันการลบ',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading("กำลังลบรายการ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'deletePurchaseOrderDraft', payload: { poNumber: poNumber, productId: productId } })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("ลบรายการสำเร็จ", "success");
                            await fetchData(true);
                            renderDraftOrdersTable();
                            renderManageOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้", "error");
                    }
                    hideLoading();
                }
            });
        }

        function exportDraftOrdersToExcel() {
            const orders = db.purchaseOrders || [];
            const draftOrders = orders.filter(o => o.status === "เตรียมสั่ง");
            if (draftOrders.length === 0) {
                showToast("ไม่มีรายการเตรียมสั่งสำหรับการส่งออก", "warning");
                return;
            }

            const data = draftOrders.map(o => {
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const unit = prod ? prod.unit : 'ชิ้น';
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                return {
                    "รหัสสินค้า": String(o.productId),
                    "ชื่อสินค้า": o.productName || '',
                    "จำนวนที่สั่ง": parseFloat(o.orderedQty) || 0,
                    "หน่วย": unit,
                    "Supplier": supplier
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "เตรียมสั่งซื้อ");

            const max_width = data.reduce((w, r) => Math.max(w, r["ชื่อสินค้า"].length), 10);
            worksheet["!cols"] = [
                { wch: 15 }, // รหัสสินค้า
                { wch: Math.min(max_width + 4, 50) }, // ชื่อสินค้า
                { wch: 15 }, // จำนวนที่สั่ง
                { wch: 10 }, // หน่วย
                { wch: 20 }  // Supplier
            ];

            // Format numbers
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const qty_cell = XLSX.utils.encode_cell({c: 2, r: R}); // Column C is orderedQty (0-indexed: 2)
                if (worksheet[qty_cell]) {
                    worksheet[qty_cell].t = 'n';
                    worksheet[qty_cell].z = '#,##0';
                }
            }

            const today = new Date();
            const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
            
            XLSX.writeFile(workbook, `Draft_Purchase_Orders_${dateStr}.xlsx`);
            showToast("ส่งออกข้อมูลสำเร็จ", "success");
        }

        function handleManageOrdersSearch(val) {
            manageOrdersSearchQuery = val.trim().toLowerCase();
            renderManageOrdersTable();
        }

        function handleManageOrdersSupplierFilter(val) {
            manageOrdersSupplierFilter = val.trim();
            renderManageOrdersTable();
        }

        function renderManageOrdersTable() {
            const tableBody = document.getElementById('manageOrdersTableBody');
            if (!tableBody) return;

            const orders = db.purchaseOrders || [];
            
            // Filter: only status "เตรียมสั่ง" and "รออนุมัติ"
            let baseFiltered = orders.filter(o => o.status === "เตรียมสั่ง" || o.status === "รออนุมัติ");

            // Update Supplier Filter Dropdown Options dynamically based on orders in this view
            const supplierSelect = document.getElementById('manageOrdersSupplierFilterSelect');
            if (supplierSelect) {
                const activeSuppliers = [...new Set(baseFiltered.map(o => {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    return o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                }).filter(Boolean))].sort();

                const supplierOptions = activeSuppliers.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
                supplierSelect.innerHTML = `<option value="">ทั้งหมด</option>${supplierOptions}`;
                
                // Restore previous select value if it's still available, otherwise reset it
                if (activeSuppliers.includes(manageOrdersSupplierFilter)) {
                    supplierSelect.value = manageOrdersSupplierFilter;
                } else {
                    manageOrdersSupplierFilter = '';
                    supplierSelect.value = '';
                }
            }

            // Filter by Supplier dropdown
            let filtered = baseFiltered;
            if (manageOrdersSupplierFilter) {
                filtered = filtered.filter(o => {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                    return supplier === manageOrdersSupplierFilter;
                });
            }

            // Filter by search query (PO Number, PR Number, รหัสสินค้า, ชื่อสินค้า)
            if (manageOrdersSearchQuery) {
                filtered = filtered.filter(o => 
                    String(o.poNumber || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    String(o.prNumber || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    String(o.productId || '').toLowerCase().includes(manageOrdersSearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(manageOrdersSearchQuery)
                );
            }

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="p-12 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fa-solid fa-tasks text-slate-200 text-4xl mb-2"></i>
                                <p class="text-sm font-bold text-slate-500">ไม่มีใบสั่งซื้อที่รอการอนุมัติหรือเตรียมสั่ง</p>
                                <p class="text-xs text-slate-400 mt-0.5">รายการจัดซื้อทั้งหมดได้รับการดำเนินงานเรียบร้อยแล้ว</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            // Grouping logic:
            // 1. Unprocessed items: status === "เตรียมสั่ง"
            const unprocessed = filtered.filter(o => o.status === "เตรียมสั่ง");
            // 2. Processed items: status === "รออนุมัติ"
            const processed = filtered.filter(o => o.status === "รออนุมัติ");

            // Sort both groups by date/poNumber descending (latest first)
            unprocessed.sort((a, b) => {
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            processed.sort((a, b) => {
                const dateA = a.orderDate || '';
                const dateB = b.orderDate || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const poA = a.poNumber || '';
                const poB = b.poNumber || '';
                return poB.localeCompare(poA);
            });

            tableBody.innerHTML = '';

            // Render Section 1: Unprocessed items (Ungrouped Flat List)
            if (unprocessed.length > 0) {
                // Section Header Row
                const headerRow = `
                    <tr class="bg-blue-50/50 text-blue-800 font-bold border-y border-blue-100">
                        <td colspan="10" class="px-4 py-2 text-xs">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-folder-open text-blue-500"></i>
                                รายการใหม่ (ยังไม่ได้ดำเนินการจัดกลุ่ม)
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', headerRow);

                unprocessed.forEach(o => {
                    renderRow(o);
                });
            }

            // Render Section 2: Grouped by Supplier
            if (processed.length > 0) {
                // Group processed items by supplier
                const groupedBySupplier = {};
                processed.forEach(o => {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                    if (!groupedBySupplier[supplier]) {
                        groupedBySupplier[supplier] = [];
                    }
                    groupedBySupplier[supplier].push(o);
                });

                // Section Header Row
                const headerRow = `
                    <tr class="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                        <td colspan="10" class="px-4 py-2 text-xs">
                            <div class="flex items-center gap-1.5">
                                <i class="fa-solid fa-boxes-packing text-slate-500"></i>
                                รายการสั่งซื้อแยกตามซัพพลายเออร์ (จัดกลุ่ม)
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', headerRow);

                // Render each supplier group
                Object.keys(groupedBySupplier).sort().forEach(supplier => {
                    const supplierHeaderRow = `
                        <tr class="bg-amber-50/40 text-amber-800 font-bold border-b border-amber-100">
                            <td colspan="10" class="px-6 py-1.5 text-[10px] uppercase tracking-wider">
                                <i class="fa-solid fa-truck-field mr-1.5"></i> Supplier: ${escapeHTML(supplier)}
                            </td>
                        </tr>
                    `;
                    tableBody.insertAdjacentHTML('beforeend', supplierHeaderRow);

                    groupedBySupplier[supplier].forEach(o => {
                        renderRow(o);
                    });
                });
            }

            // Helper to render a single row
            function renderRow(o) {
                const dateStr = formatDateTimeThai(o.orderDate);
                const displayPo = o.poNumber.indexOf("PO-DRF-") === 0 ? `<span class="text-slate-400 italic">ดราฟต์</span>` : escapeHTML(o.poNumber);
                const displayPr = o.prNumber === "PR-DRAFT" ? `<span class="text-slate-400 italic">ดราฟต์</span>` : escapeHTML(o.prNumber);

                // Determine unit cost and total cost. Fall back to db.products cost if 0
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                const total = o.orderedQty * cost;
                
                const prod = db.products.find(p => String(p.id).trim() === String(o.productId).trim());
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');

                const rowHtml = `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 text-slate-500">${escapeHTML(dateStr)}</td>
                        <td class="p-4 font-semibold text-slate-700">${displayPo}</td>
                        <td class="p-4 font-mono text-[11px] text-slate-500">${displayPr}</td>
                        <td class="p-4 font-mono text-[11px] text-slate-500">${escapeHTML(o.productId)}</td>
                        <td class="p-4 font-semibold text-slate-800">${escapeHTML(o.productName)}</td>
                        <td class="p-4 text-slate-600">${escapeHTML(supplier)}</td>
                        <td class="p-4 text-center font-bold text-slate-700">${o.orderedQty}</td>
                        <td class="p-4 text-right text-slate-600 font-mono">฿${cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-4 text-right text-slate-800 font-bold font-mono">฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="handleUpdateOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 font-bold rounded-lg text-[10px] transition border border-amber-200 shadow-sm active:scale-95">
                                    <i class="fa-solid fa-pen-to-square"></i> อัพเดท
                                </button>
                                <button onclick="handleDeleteOrderDraft('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold rounded-lg text-[10px] transition border border-rose-200 shadow-sm active:scale-95" title="ลบรายการ">
                                    <i class="fa-solid fa-trash-can"></i> ลบ
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHtml);
            }
        }

        window.recalculateSwalTotalCost = function() {
            const qtyInput = document.getElementById('swal-update-qty');
            const costInput = document.getElementById('swal-update-cost');
            const totalSpan = document.getElementById('swal-update-total');
            if (!qtyInput || !costInput || !totalSpan) return;

            const qty = parseFloat(qtyInput.value) || 0;
            const cost = parseFloat(costInput.value) || 0;
            const total = qty * cost;
            totalSpan.innerText = '฿' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        };

        function handleUpdateOrderDraft(poNumber, productId) {
            const orders = db.purchaseOrders || [];
            const order = orders.find(o => poNumber ? o.poNumber === poNumber : (o.productId === productId && o.status === "เตรียมสั่ง"));
            if (!order) return;

            const prod = db.products.find(p => String(p.id).trim() === String(order.productId).trim());
            const currentSupplier = order.supplier || (prod ? (prod.supplier || '') : '');
            const currentUnit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';

            let initialCost = parseFloat(order.unitCost) || 0;
            if (initialCost === 0 && prod) {
                initialCost = parseFloat(prod.cost) || 0;
            }

            const initialPo = order.poNumber.indexOf("PO-DRF-") === 0 ? '' : order.poNumber;
            const initialPr = order.prNumber === "PR-DRAFT" ? '' : order.prNumber;

            Swal.fire({
                title: '<i class="fa-solid fa-tasks text-amber-600 mr-2"></i>อัปเดตใบสั่งซื้อ',
                html: `
                    <div class="space-y-4 text-left text-xs">
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div class="col-span-2">
                                <span class="text-slate-400 block mb-0.5">ชื่อสินค้า:</span>
                                <span class="font-bold text-slate-800 text-xs">${escapeHTML(order.productName)}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block mb-0.5">รหัสสินค้า:</span>
                                <span class="font-bold font-mono text-slate-800">${escapeHTML(order.productId)}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block mb-0.5">ราคารวม (คำนวน):</span>
                                <span id="swal-update-total" class="font-extrabold text-blue-600 text-xs">฿0.00</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">จำนวนที่สั่ง</label>
                                <input type="number" id="swal-update-qty" min="1" value="${order.orderedQty}" oninput="recalculateSwalTotalCost()" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                                <input type="number" id="swal-update-cost" min="0" step="0.01" value="${initialCost}" oninput="recalculateSwalTotalCost()" class="swal2-input !mx-0 !w-full !text-xs !h-9">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">หน่วยนับ</label>
                                <input type="text" id="swal-update-unit" value="${escapeHTML(currentUnit)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุหน่วยนับ (เช่น ชิ้น, กล่อง)">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">สถานะ</label>
                                <select id="swal-update-status" class="swal2-select !mx-0 !w-full !text-xs !h-9 !border-slate-200 !rounded-xl !px-3 focus:!border-blue-500">
                                    <option value="เตรียมสั่ง" ${order.status === 'เตรียมสั่ง' ? 'selected' : ''}>เตรียมสั่ง</option>
                                    <option value="รออนุมัติ" ${order.status === 'รออนุมัติ' ? 'selected' : ''}>รออนุมัติ</option>
                                    <option value="สั่งแล้ว" ${order.status === 'สั่งแล้ว' ? 'selected' : ''}>สั่งแล้ว (นำออกจากหน้านี้)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-600 mb-1">Supplier</label>
                            <input type="text" id="swal-update-supplier" list="list_product_suppliers" value="${escapeHTML(currentSupplier)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุซัพพลายเออร์">
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">PR Number (เลขที่ขอซื้อ)</label>
                                <input type="text" id="swal-update-pr" value="${escapeHTML(initialPr)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุ PR (เว้นว่างไว้เพื่อเป็นดราฟต์)">
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 mb-1">PO Number (เลขที่ใบสั่งซื้อ)</label>
                                <input type="text" id="swal-update-po" value="${escapeHTML(initialPo)}" class="swal2-input !mx-0 !w-full !text-xs !h-9" placeholder="ระบุ PO (เว้นว่างไว้เพื่อเป็นดราฟต์)">
                            </div>
                        </div>
                    </div>
                `,
                confirmButtonText: '<i class="fa-solid fa-save mr-1.5"></i>บันทึกการอัปเดต',
                confirmButtonColor: '#d97706',
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                focusConfirm: false,
                customClass: {
                    popup: 'rounded-2xl w-full max-w-lg',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                didOpen: () => {
                    recalculateSwalTotalCost();
                },
                preConfirm: () => {
                    const qtyInput = document.getElementById('swal-update-qty');
                    const costInput = document.getElementById('swal-update-cost');
                    const supplierInput = document.getElementById('swal-update-supplier');
                    const statusSelect = document.getElementById('swal-update-status');
                    const poInput = document.getElementById('swal-update-po');
                    const prInput = document.getElementById('swal-update-pr');
                    const unitInput = document.getElementById('swal-update-unit');

                    const qtyVal = parseFloat(qtyInput.value);
                    const costVal = parseFloat(costInput.value) || 0;
                    const statusVal = statusSelect.value;
                    const poVal = poInput.value.trim();
                    const prVal = prInput.value.trim();
                    const unitVal = unitInput.value.trim() || 'ชิ้น';

                    if (isNaN(qtyVal) || qtyVal <= 0) {
                        Swal.showValidationMessage('กรุณากรอกจำนวนที่สั่งซื้อให้ถูกต้อง');
                        return false;
                    }
                    if (costVal < 0) {
                        Swal.showValidationMessage('กรุณากรอกราคาต่อหน่วยให้ถูกต้อง');
                        return false;
                    }
                    if (statusVal === 'สั่งแล้ว') {
                        if (!poVal || !prVal) {
                            Swal.showValidationMessage('กรุณากรอกเลขที่ PO Number และ PR Number ให้ครบทั้งสองช่องเพื่อเปลี่ยนสถานะเป็น "สั่งแล้ว"');
                            return false;
                        }
                    }

                    return {
                        originalPoNumber: order.poNumber,
                        newPoNumber: poVal,
                        newPrNumber: prVal,
                        orderedQty: qtyVal,
                        unitCost: costVal,
                        status: statusVal,
                        productId: order.productId,
                        newSupplier: supplierInput.value.trim(),
                        newUnit: unitVal
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed && result.value) {
                    const data = result.value;
                    
                    if (data.status === 'สั่งแล้ว') {
                        const confirmResult = await Swal.fire({
                            title: 'ยืนยันการเปลี่ยนสถานะ?',
                            text: 'หากเปลี่ยนสถานะเป็น "สั่งแล้ว" รายการนี้จะถูกย้ายออกจากหน้าจัดการคำสั่งซื้อไปยังหน้าตรวจรับสินค้าทันที',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#2563eb',
                            cancelButtonColor: '#6b7280',
                            confirmButtonText: 'ยืนยันเปลี่ยนเป็นสั่งแล้ว',
                            cancelButtonText: 'ยกเลิก',
                            reverseButtons: true,
                            customClass: {
                                popup: 'rounded-2xl',
                                confirmButton: 'rounded-xl font-semibold !text-xs',
                                cancelButton: 'rounded-xl font-semibold !text-xs',
                            }
                        });
                        
                        if (!confirmResult.isConfirmed) {
                            return;
                        }
                    }
                    
                    showLoading("กำลังอัปเดตใบสั่งซื้อ...");
                    try {
                        const res = await fetch(API_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'updatePurchaseOrderDraft', payload: data })
                        });
                        const resData = await res.json();
                        if (resData.status === 'success') {
                            showToast("อัปเดตใบสั่งซื้อสำเร็จ!", "success");
                            await fetchData(true);
                            renderManageOrdersTable();
                        } else {
                            showToast("เกิดข้อผิดพลาด: " + resData.message, "error");
                        }
                    } catch (error) {
                        showToast("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: " + error.message, "error");
                    }
                    hideLoading();
                }
            });
        }

        function handleHistorySearch(val) {
            poHistoryCurrentPage = 1;
            purchaseHistorySearchQuery = val.trim().toLowerCase();
            renderPurchaseHistoryCards();
        }

        function handleHistoryCategoryFilter(val) {
            poHistoryCurrentPage = 1;
            purchaseHistoryCategoryFilter = val.trim();
            renderPurchaseHistoryCards();
        }

        function handleHistoryGroupFilter(val) {
            poHistoryCurrentPage = 1;
            purchaseHistoryGroupFilter = val.trim();
            renderPurchaseHistoryCards();
        }

        function renderPurchaseHistoryCards() {
            const container = document.getElementById('purchaseHistoryCardsContainer');
            if (!container) return;

            const orders = db.purchaseOrders || [];
            const products = db.products || [];
            const isAdmin = currentUser && currentUser.role === 'ADMIN';

            // Filter orders: only ordered items (exclude drafts, wait-for-approvals)
            let processedOrders = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง");

            // Filter by search query (PO, PR, Product ID, Product Name)
            if (purchaseHistorySearchQuery) {
                processedOrders = processedOrders.filter(o => 
                    String(o.poNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.prNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.productId || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(purchaseHistorySearchQuery)
                );
            }

            // Group processed orders by productId
            const grouped = {};
            processedOrders.forEach(o => {
                if (!grouped[o.productId]) {
                    grouped[o.productId] = [];
                }
                grouped[o.productId].push(o);
            });

            // Map products matching filters
            let cardData = [];
            Object.keys(grouped).forEach(prodId => {
                const prod = products.find(p => String(p.id).trim() === String(prodId).trim());
                if (!prod) return;

                // Category filter
                if (purchaseHistoryCategoryFilter && prod.category !== purchaseHistoryCategoryFilter) return;

                // Group filter
                if (purchaseHistoryGroupFilter && prod.group !== purchaseHistoryGroupFilter) return;

                // Calculate stats
                const itemOrders = grouped[prodId];
                const orderCount = itemOrders.length;
                let totalVal = 0;
                let latestDate = '';
                itemOrders.forEach(o => {
                    let cost = parseFloat(o.unitCost) || 0;
                    if (cost === 0) {
                        cost = parseFloat(prod.cost) || 0;
                    }
                    totalVal += (o.orderedQty * cost);

                    const d = o.orderDate || '';
                    if (d > latestDate) latestDate = d;
                });

                cardData.push({
                    productId: prodId,
                    productName: prod.name,
                    unit: prod.unit || 'ชิ้น',
                    orderCount: orderCount,
                    totalVal: totalVal,
                    orders: itemOrders,
                    latestDate: latestDate
                });
            });

            // Sort cards by the latest order date descending
            cardData.sort((a, b) => b.latestDate.localeCompare(a.latestDate));

            const pageSize = 20;
            const totalItems = cardData.length;
            const totalPages = Math.ceil(totalItems / pageSize);

            if (poHistoryCurrentPage > totalPages) poHistoryCurrentPage = totalPages;
            if (poHistoryCurrentPage < 1) poHistoryCurrentPage = 1;

            if (cardData.length === 0) {
                container.innerHTML = `
                    <div class="border border-slate-150 rounded-2xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center py-12">
                        <i class="fa-solid fa-clock-rotate-left text-slate-300 text-4xl mb-3"></i>
                        <p class="text-sm font-bold text-slate-600">ไม่พบประวัติการสั่งซื้อ</p>
                        <p class="text-xs text-slate-400 mt-1">ไม่มีข้อมูลประวัติใบสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                `;
                renderGenericPagination('poHistoryPaginationContainer', 'poHistoryPaginationInfo', 'poHistoryPaginationControls', 0, 1, pageSize, 'changePoHistoryPage');
                return;
            }

            const startIndex = (poHistoryCurrentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageCardData = cardData.slice(startIndex, endIndex);

            container.innerHTML = '';
            pageCardData.forEach((card, index) => {
                const cardId = `history-card-${index}`;
                const detailId = `history-detail-${index}`;
                const arrowId = `history-arrow-${index}`;

                // Sort orders in-place by date/PO descending (latest first)
                card.orders.sort((a, b) => {
                    const dateA = a.orderDate || '';
                    const dateB = b.orderDate || '';
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                    const poA = a.poNumber || '';
                    const poB = b.poNumber || '';
                    return poB.localeCompare(poA);
                });

                // Construct orders rows HTML
                let ordersHtml = card.orders.map(o => {
                    const dateStr = formatDateTimeThai(o.orderDate);
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    let cost = parseFloat(o.unitCost) || 0;
                    if (cost === 0 && prod) {
                        cost = parseFloat(prod.cost) || 0;
                    }
                    const total = o.orderedQty * cost;
                    const supplier = prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ';

                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 text-slate-500">${escapeHTML(dateStr)}</td>
                            <td class="p-3 font-semibold text-slate-700">${escapeHTML(o.poNumber)}</td>
                            <td class="p-3 font-mono text-[11px] text-slate-500">${escapeHTML(o.prNumber)}</td>
                            <td class="p-3 text-slate-600">${escapeHTML(supplier)}</td>
                            <td class="p-3 text-center font-bold text-slate-700">${o.orderedQty}</td>
                            <td class="p-3 text-right text-slate-600 font-mono">฿${cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td class="p-3 text-right text-slate-800 font-bold font-mono">฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            ${isAdmin ? `
                            <td class="p-3 text-center">
                                <button onclick="deleteSingleHistoryRecord('${escapeForJS(o.poNumber)}', '${escapeForJS(o.productId)}')" class="inline-flex items-center justify-center w-7 h-7 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition active:scale-95 border border-rose-100 hover:border-rose-600 shadow-sm" title="ลบรายการนี้">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </td>
                            ` : ''}
                        </tr>
                    `;
                }).join('');

                const cardHtml = `
                    <div class="bg-white border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
                        <!-- Card Header (Clickable) -->
                        <div onclick="toggleHistoryCardDetail('${detailId}', '${arrowId}')" class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition duration-150 select-none">
                            <div class="flex items-start gap-4">
                                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                                    <i class="fa-solid fa-boxes-packing text-base"></i>
                                </div>
                                <div class="text-left">
                                    <span class="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] font-mono mb-1">${escapeHTML(card.productId)}</span>
                                    <h4 class="text-sm font-bold text-slate-800 leading-tight">${escapeHTML(card.productName)}</h4>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-6">
                                <!-- Stats -->
                                <div class="text-right hidden sm:block">
                                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">สั่งซื้อแล้ว</span>
                                    <span class="font-bold text-slate-800 text-sm">${card.orderCount} ครั้ง</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] text-slate-400 block font-semibold uppercase">มูลค่ารวมสะสม</span>
                                    <span class="font-extrabold text-blue-600 text-sm">฿${card.totalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                                <button class="text-slate-400 hover:text-slate-600 transition">
                                    <i id="${arrowId}" class="fa-solid fa-chevron-down transform transition-transform duration-200"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Card Expandable Detail Section -->
                        <div id="${detailId}" class="hidden border-t border-slate-150 bg-slate-50/40 transition-all duration-300">
                            <div class="p-4 overflow-x-auto w-full table-scroll">
                                <table class="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr class="border-b border-slate-200 text-slate-500 font-bold bg-slate-100/50">
                                            <th class="p-3">วันที่สั่ง</th>
                                            <th class="p-3">PO Number</th>
                                            <th class="p-3">PR Number</th>
                                            <th class="p-3">Supplier</th>
                                            <th class="p-3 text-center">จำนวน</th>
                                            <th class="p-3 text-right">ราคา/หน่วย</th>
                                            <th class="p-3 text-right">ราคารวม</th>
                                            ${isAdmin ? `<th class="p-3 text-center" style="width: 80px;">จัดการ</th>` : ''}
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">
                                        ${ordersHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHtml);
            });

            renderGenericPagination('poHistoryPaginationContainer', 'poHistoryPaginationInfo', 'poHistoryPaginationControls', totalItems, poHistoryCurrentPage, pageSize, 'changePoHistoryPage');
        }

        window.changePoHistoryPage = function(page) {
            poHistoryCurrentPage = page;
            renderPurchaseHistoryCards();
        };

        window.setPurchaseHistoryTab = function(tab) {
            const btnPo = document.getElementById('tab-history-po');
            const btnReceive = document.getElementById('tab-history-receive');
            const secPo = document.getElementById('view-history-po-section');
            const secReceive = document.getElementById('view-history-receive-section');

            if (!btnPo || !btnReceive || !secPo || !secReceive) return;

            if (tab === 'po-history') {
                btnPo.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/55";
                btnReceive.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
                secPo.classList.remove('hidden');
                secReceive.classList.add('hidden');
                poHistoryCurrentPage = 1;
                renderPurchaseHistoryCards();
            } else {
                btnReceive.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm border border-slate-200/55";
                btnPo.className = "px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800";
                secReceive.classList.remove('hidden');
                secPo.classList.add('hidden');
                receiveHistoryCurrentPage = 1;
                renderReceiveHistoryTable();
            }
        };

                window.renderReceiveHistoryTable = async function() {
            const container = document.getElementById('receiveHistoryCardsContainer');
            if (!container) return;

            try {
                if (!transactions || transactions.length === 0) {
                    if (db && Array.isArray(db.transactions) && db.transactions.length > 0) {
                        transactions = db.transactions;
                    } else {
                        showLoading('กำลังโหลดประวัติการรับเข้า...');
                        try {
                            let transRes = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTransactions' }) });
                            let result = await transRes.json();
                            if (result.status === 'success' && Array.isArray(result.data)) {
                                transactions = result.data;
                            }
                        } catch (e) {
                            showToast('ไม่สามารถดึงข้อมูลประวัติจากเครือข่ายได้', 'error');
                        }
                        hideLoading();
                    }
                }

                const searchInput = document.getElementById('searchReceiveHistoryInput');
                const searchKeyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

                container.innerHTML = '';

                const grouped = {};

                // 1. Populate from purchase orders that are ordered or received
                const purchaseOrders = (db && Array.isArray(db.purchaseOrders)) ? db.purchaseOrders : [];
                purchaseOrders.forEach(po => {
                    if (!po || !po.poNumber) return;
                    const poNum = String(po.poNumber).trim();
                    const recQty = parseFloat(po.receivedQty) || 0;
                    // แสดงเฉพาะรายการที่มีการรับสินค้าแล้วจริงเท่านั้น (recQty > 0)
                    if (recQty <= 0) return;

                    const groupKey = "PO:" + poNum;
                    grouped[groupKey] = {
                        poNumber: poNum,
                        txId: poNum,
                        isPo: true,
                        transactions: [],
                        totalQty: recQty,
                        latestDate: po.lastReceivedDate || po.orderDate || ''
                    };
                });

                // 2. Populate / merge from transactions
                let receiveTx = (transactions || []).filter(t => t.status === 'Restock' || t.machine_id === 'PO_RECEIVE' || t.machine_id === 'RESTOCK');

                receiveTx.forEach(t => {
                    let poNum = "";
                    if (t.note) {
                        if (t.note.startsWith("รับสินค้าจาก PO ")) {
                            poNum = t.note.replace("รับสินค้าจาก PO ", "").trim();
                        } else if (t.note.startsWith("รับสินค้าfrom PO ")) {
                            poNum = t.note.replace("รับสินค้าfrom PO ", "").trim();
                        } else {
                            const match = t.note.match(/PO[-:\s]*([A-Za-z0-9\-_]+)/i);
                            if (match && match[1]) poNum = match[1];
                        }
                    }

                    const groupKey = poNum ? ("PO:" + poNum) : ("TX:" + (t.id || 'RESTOCK'));

                    if (!grouped[groupKey]) {
                        grouped[groupKey] = {
                            poNumber: poNum || '',
                            txId: t.id || poNum || '',
                            isPo: !!poNum,
                            transactions: [],
                            totalQty: 0,
                            latestDate: ''
                        };
                    }

                    if (!grouped[groupKey].transactions.some(existing => existing.id === t.id)) {
                        grouped[groupKey].transactions.push(t);
                    }

                    const d = t.date || t.created_at || '';
                    if (d > grouped[groupKey].latestDate) {
                        grouped[groupKey].latestDate = d;
                    }
                });

                // Calculate total quantities from transactions if transactions exist
                Object.values(grouped).forEach(g => {
                    if (g.transactions && g.transactions.length > 0) {
                        let tQty = 0;
                        g.transactions.forEach(t => {
                            if (t.items && t.items.length > 0) {
                                t.items.forEach(item => {
                                    tQty += parseFloat(item.qty) || 0;
                                });
                            }
                        });
                        g.totalQty = tQty;
                    }
                });

                // Convert grouped object to array and sort by latestDate descending
                let receiveGroups = Object.values(grouped).filter(g => g.totalQty > 0 || (g.transactions && g.transactions.length > 0));
                receiveGroups.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));

                // Apply search filter
                if (searchKeyword) {
                    receiveGroups = receiveGroups.filter(g => {
                        if (g.poNumber && String(g.poNumber).toLowerCase().includes(searchKeyword)) return true;
                        if (g.txId && String(g.txId).toLowerCase().includes(searchKeyword)) return true;
                        
                        const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                        const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                        const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                        let productId = firstItem ? firstItem.product_id : '';
                        if (po && po.productId) productId = po.productId;
                        const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                        const supplierName = (po && po.supplier) ? po.supplier : (prod && prod.supplier ? prod.supplier : '');
                        if (supplierName && supplierName.toLowerCase().includes(searchKeyword)) return true;

                        if (g.transactions && g.transactions.length > 0) {
                            return g.transactions.some(t => {
                                const noteText = (t.note || '').toLowerCase();
                                const reqText = (t.requester || '').toLowerCase();
                                let prodMatch = false;
                                if (t.items && t.items.length > 0) {
                                    t.items.forEach(item => {
                                        const prodItem = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(item.product_id).trim().toLowerCase()) : null;
                                        if (prodItem && prodItem.name && prodItem.name.toLowerCase().includes(searchKeyword)) {
                                            prodMatch = true;
                                        }
                                    });
                                }
                                return noteText.includes(searchKeyword) || reqText.includes(searchKeyword) || prodMatch;
                            });
                        }
                        return false;
                    });
                }

                // Apply Category and Group filters
                if (receiveHistoryCategoryFilter || receiveHistoryGroupFilter) {
                    receiveGroups = receiveGroups.filter(g => {
                        const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                        const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                        const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                        let productId = firstItem ? firstItem.product_id : '';
                        if (po && po.productId) productId = po.productId;
                        
                        const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                        if (!prod) return false;
                        
                        if (receiveHistoryCategoryFilter && prod.category !== receiveHistoryCategoryFilter) return false;
                        if (receiveHistoryGroupFilter && prod.group !== receiveHistoryGroupFilter) return false;
                        return true;
                    });
                }

                if (receiveGroups.length === 0) {
                    container.innerHTML = `
                        <div class="border border-slate-150 rounded-2xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center py-12">
                            <i class="fa-solid fa-boxes-stacked text-slate-300 text-4xl mb-3"></i>
                            <p class="text-sm font-bold text-slate-600">ไม่พบประวัติการรับเข้า</p>
                            <p class="text-xs text-slate-400 mt-1">ไม่มีข้อมูลประวัติการรับเข้าคลังที่ตรงกับเงื่อนไขการค้นหา</p>
                        </div>
                    `;
                    renderGenericPagination('receiveHistoryPaginationContainer', 'receiveHistoryPaginationInfo', 'receiveHistoryPaginationControls', 0, 1, 20, 'changeReceiveHistoryPage');
                    return;
                }

                const rxPageSize = 20;
                const rxTotalItems = receiveGroups.length;
                const rxTotalPages = Math.ceil(rxTotalItems / rxPageSize);
                if (receiveHistoryCurrentPage > rxTotalPages) receiveHistoryCurrentPage = rxTotalPages;
                if (receiveHistoryCurrentPage < 1) receiveHistoryCurrentPage = 1;
                const rxStartIndex = (receiveHistoryCurrentPage - 1) * rxPageSize;
                const rxEndIndex = rxStartIndex + rxPageSize;
                const pagedReceiveGroups = receiveGroups.slice(rxStartIndex, rxEndIndex);

                const formatDateTimeThai = (dateStr) => {
                    return window.formatDateTimeThai ? window.formatDateTimeThai(dateStr) : dateStr;
                };

                const isAdmin = currentUser && currentUser.role === 'ADMIN';

                pagedReceiveGroups.forEach((g, index) => {
                    let productName = 'ไม่พบชื่อสินค้า';
                    let productId = '';
                    let unit = 'ชิ้น';
                    const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                    const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                    
                    if (firstItem) {
                        productId = firstItem.product_id;
                        const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                        if (prod) {
                            productName = prod.name;
                            unit = prod.unit || 'ชิ้น';
                        }
                    }

                    const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                    if (po) {
                        productName = po.productName || productName;
                        productId = po.productId || productId;
                    }

                    const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                    const supplierName = (po && po.supplier) ? po.supplier : (prod && prod.supplier ? prod.supplier : 'ไม่ระบุ');
                    const poDisplay = g.poNumber ? g.poNumber : (g.txId || '-');
                    const formattedLatestDate = formatDateTimeThai(g.latestDate);

                    let pendingQty = 0;
                    if (g.isPo && po) {
                        pendingQty = Math.max(0, (parseFloat(po.orderedQty) || 0) - (parseFloat(po.receivedQty) || 0));
                    }

                    let statusHtml = '';
                    if (g.isPo) {
                        if (pendingQty > 0) {
                            statusHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">ค้างรับ (${pendingQty} ${unit})</span>`;
                        } else {
                            statusHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">รับครบ</span>`;
                        }
                    } else {
                        statusHtml = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">รับครบ</span>`;
                    }

                    // Sort transactions within the group by date descending (latest first)
                    if (g.transactions && g.transactions.length > 0) {
                        g.transactions.sort((a, b) => {
                            const dateA = a.date || a.created_at || '';
                            const dateB = b.date || b.created_at || '';
                            return dateB.localeCompare(dateA);
                        });
                    }

                    let rowsHtml = '';
                    if (g.transactions && g.transactions.length > 0) {
                        rowsHtml = g.transactions.map((t, idx) => {
                            let tQty = 0;
                            if (t.items && t.items.length > 0) {
                                t.items.forEach(item => {
                                    tQty += parseFloat(item.qty) || 0;
                                });
                            }

                            const formattedDate = formatDateTimeThai(t.date || t.created_at || '');

                            return `
                                <tr class="hover:bg-slate-50 transition border-b border-gray-150 last:border-0 text-xs">
                                    <td class="p-3 text-center text-gray-500">${idx + 1}</td>
                                    <td class="p-3 font-bold text-gray-900">
                                        <span onclick="openTransactionDetailModal('${escapeForJS(t.id)}')" class="cursor-pointer text-slate-800 hover:text-emerald-600 hover:underline" title="ดูรายละเอียด">${escapeHTML(t.id)}</span>
                                    </td>
                                    <td class="p-3 text-gray-500 text-xs font-mono">${escapeHTML(formattedDate)}</td>
                                    <td class="p-3 text-gray-700 font-semibold">${escapeHTML(t.requester || '-')} <span class="text-[10px] text-slate-400 font-normal">(${escapeHTML(t.department || '-')})</span></td>
                                    <td class="p-3 font-bold text-slate-800 text-right">${tQty} ${unit}</td>
                                </tr>
                            `;
                        }).join('');
                    }

                    if (!rowsHtml) {
                        rowsHtml = `
                            <tr class="hover:bg-slate-50 transition border-b border-gray-150 last:border-0 text-xs">
                                <td class="p-3 text-center text-gray-500">1</td>
                                <td class="p-3 font-bold text-gray-900">${escapeHTML(g.poNumber || g.txId)}</td>
                                <td class="p-3 text-gray-500 text-xs font-mono">${escapeHTML(formattedLatestDate)}</td>
                                <td class="p-3 text-gray-700 font-semibold">สโตร์ (รับเข้า) <span class="text-[10px] text-slate-400 font-normal">(คลังสินค้า)</span></td>
                                <td class="p-3 font-bold text-slate-800 text-right">${g.totalQty} ${unit}</td>
                            </tr>
                        `;
                    }

                    const cardId = `receive-card-${index}`;
                    const detailId = `receive-detail-${index}`;
                    const arrowId = `receive-arrow-${index}`;

                    const poKeyParam = g.poNumber ? ("PO:" + g.poNumber) : ("TX:" + g.txId);
                    const itemCount = (g.transactions && g.transactions.length > 0) ? g.transactions.length : 1;

                    const cardHtml = `
                        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden">
                            <!-- Card Header (Clickable) -->
                            <div onclick="toggleHistoryCardDetail('${detailId}', '${arrowId}')" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition duration-150 select-none">
                                <div class="flex items-start gap-3.5 text-left flex-1 min-w-0">
                                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                                        <i class="fa-solid fa-boxes-stacked text-base"></i>
                                    </div>
                                    <div class="text-left flex-1 min-w-0">
                                        <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100/80 text-emerald-800 font-bold rounded-lg text-xs font-mono">
                                                <i class="fa-solid fa-hashtag text-[10px] text-emerald-600"></i>
                                                <span>เลข PO: ${escapeHTML(poDisplay)}</span>
                                            </span>
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                                                <i class="fa-regular fa-calendar-alt text-[10px] text-slate-400"></i>
                                                <span>วันที่ทำรายการ: ${escapeHTML(formattedLatestDate)}</span>
                                            </span>
                                        </div>
                                        <div class="text-xs text-slate-600 flex items-center gap-1.5 mb-1">
                                            <i class="fa-solid fa-truck-field text-slate-400 text-xs"></i>
                                            <span class="font-semibold text-slate-500">ซัพพลาย:</span>
                                            <span class="font-bold text-slate-800">${escapeHTML(supplierName)}</span>
                                        </div>
                                        <div class="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                            <i class="fa-solid fa-box text-slate-300 text-[11px]"></i>
                                            <span class="font-bold text-slate-700 truncate">${escapeHTML(productName)}</span>
                                            <span class="text-[11px] text-slate-400">(${escapeHTML(productId)})</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                    <div class="min-w-[75px] text-center">
                                        ${statusHtml}
                                    </div>
                                    <button class="text-slate-400 hover:text-slate-600 transition p-1">
                                        <i id="${arrowId}" class="fa-solid fa-chevron-down transform transition-transform duration-200"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Card Expandable Detail Section -->
                            <div id="${detailId}" class="hidden border-t border-slate-150 bg-slate-50/40 transition-all duration-300">
                                <!-- Single Print Button Action Header -->
                                <div class="p-4 bg-white border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <i class="fa-solid fa-file-invoice text-emerald-600"></i>
                                            ประวัติการรับเข้าสำหรับ PO: <span class="font-mono text-emerald-700">${escapeHTML(poDisplay)}</span>
                                        </h5>
                                        <span class="text-[11px] text-slate-400 mt-0.5 block">รวมจำนวนรับเข้าทั้งสิ้น ${g.totalQty} ${unit} (${itemCount} รายการทำรายการ)</span>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button onclick="printPOGroupSlip('${escapeForJS(poKeyParam)}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-2 cursor-pointer">
                                            <i class="fa-solid fa-print"></i> พิมพ์ใบรับเข้าสินค้า
                                        </button>
                                        ${isAdmin ? `
                                        <button onclick="deleteSingleReceiveGroup('${escapeForJS(poKeyParam)}')" class="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl font-bold text-xs transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer" title="ลบประวัติรายการรับเข้านี้">
                                            <i class="fa-solid fa-trash-can"></i> ลบรายการนี้
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>

                                <div class="p-4 overflow-x-auto w-full table-scroll">
                                    <table class="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr class="border-b border-slate-200 text-slate-500 font-bold bg-slate-100/50">
                                                <th class="p-3 text-center" style="width: 50px;">ลำดับ</th>
                                                <th class="p-3">เลขที่ใบรับเข้า</th>
                                                <th class="p-3">วันที่ทำรายการ</th>
                                                <th class="p-3">ผู้รับเข้า (แผนก)</th>
                                                <th class="p-3 text-right">จำนวนรับเข้า</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 bg-white">
                                            ${rowsHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', cardHtml);
                });

                renderGenericPagination('receiveHistoryPaginationContainer', 'receiveHistoryPaginationInfo', 'receiveHistoryPaginationControls', rxTotalItems, receiveHistoryCurrentPage, rxPageSize, 'changeReceiveHistoryPage');
            } catch (err) {
                console.error("Error rendering receive history table:", err);
            }
        };

        window.handleReceiveHistorySearch = function() {
            receiveHistoryCurrentPage = 1;
            renderReceiveHistoryTable();
        };

        window.handleReceiveHistoryCategoryFilter = function(val) {
            receiveHistoryCurrentPage = 1;
            receiveHistoryCategoryFilter = val.trim();
            renderReceiveHistoryTable();
        };

        window.handleReceiveHistoryGroupFilter = function(val) {
            receiveHistoryCurrentPage = 1;
            receiveHistoryGroupFilter = val.trim();
            renderReceiveHistoryTable();
        };

        window.changeReceiveHistoryPage = function(page) {
            receiveHistoryCurrentPage = page;
            renderReceiveHistoryTable();
        };

        window.toggleHistoryCardDetail = function(detailId, arrowId) {
            const detailEl = document.getElementById(detailId);
            const arrowEl = document.getElementById(arrowId);
            if (!detailEl || !arrowEl) return;

            if (detailEl.classList.contains('hidden')) {
                detailEl.classList.remove('hidden');
                arrowEl.classList.add('rotate-180');
            } else {
                detailEl.classList.add('hidden');
                arrowEl.classList.remove('rotate-180');
            }
        };

        window.printPOGroupSlip = function(poKey) {
            if (!transactions || transactions.length === 0) {
                showToast('ไม่มีข้อมูลรายการรับเข้า', 'error');
                return;
            }

            let poNum = "";
            let matchingTxs = [];

            let receiveTx = transactions.filter(t => t.status === 'Restock' || t.machine_id === 'PO_RECEIVE' || t.machine_id === 'RESTOCK');

            if (poKey.startsWith("PO:")) {
                poNum = poKey.replace("PO:", "").trim();
            } else if (poKey.startsWith("TX:")) {
                const txId = poKey.replace("TX:", "").trim();
                matchingTxs = receiveTx.filter(t => t.id === txId);
            } else {
                poNum = poKey.trim();
            }

            if (poNum) {
                matchingTxs = receiveTx.filter(t => {
                    let p = "";
                    if (t.note) {
                        if (t.note.startsWith("รับสินค้าจาก PO ")) {
                            p = t.note.replace("รับสินค้าจาก PO ", "").trim();
                        } else if (t.note.startsWith("รับสินค้าfrom PO ")) {
                            p = t.note.replace("รับสินค้าfrom PO ", "").trim();
                        } else {
                            const match = t.note.match(/PO[-:\s]*([A-Za-z0-9\-_]+)/i);
                            if (match && match[1]) p = match[1];
                        }
                    }
                    return String(p).trim() === String(poNum).trim() || String(t.id).trim() === String(poNum).trim();
                });
            }

            if (matchingTxs.length === 0) {
                showToast('ไม่พบรายการรับเข้าสำหรับ PO นี้', 'error');
                return;
            }

            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) { showToast('กรุณาอนุญาต popup ในเบราว์เซอร์ก่อน', 'error'); return; }
            const doc = printWindow.document;

            const logoUrl = 'https://lh3.googleusercontent.com/d/1kH8HErbms_U0xnoiJ7jlW7r79FK3hXeB';
            const companyNameTh = 'บริษัท พีรพัฒน์ เทคโนโลยี จำกัด (มหาชน) สำนักงานใหญ่';
            const companyNameEn = 'PEERAPAT TECHNOLOGY PUBLIC COMPANY LIMITED';
            const companyAddressTh = '406 ถ.รัชดาภิเษก แขวงสามเสนนอก เขตห้วยขวาง กรุงเทพ 10310';
            const companyAddressEn = '406 Ratchadapisek Rd., Samsen Nork, Huaykwang, Bangkok 10310';
            const companyContact = 'Tel. 02-290-1200 Fax: 02-290-1249';
            const companyWebsite = 'Web site: https://www.peerapat.com';
            const companyTaxId = 'เลขประจำตัวผู้เสียภาษี 0107551000231';

            const formatDateTimeThai = (dateStr) => {
                return window.formatDateTimeThai ? window.formatDateTimeThai(dateStr) : dateStr;
            };

            matchingTxs.sort((a, b) => {
                const dA = a.date || a.created_at || '';
                const dB = b.date || b.created_at || '';
                return dA.localeCompare(dB);
            });

            const latestTx = matchingTxs[matchingTxs.length - 1];
            const formattedLatestDate = formatDateTimeThai(latestTx.date || latestTx.created_at || '');
            const po = poNum ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === poNum) : null) : null;

            const itemMap = {};
            let totalQty = 0;

            matchingTxs.forEach(t => {
                if (t.items && t.items.length > 0) {
                    t.items.forEach(item => {
                        const pid = String(item.product_id).trim();
                        if (!itemMap[pid]) {
                            itemMap[pid] = {
                                product_id: pid,
                                qty: 0
                            };
                        }
                        itemMap[pid].qty += parseFloat(item.qty) || 0;
                        totalQty += parseFloat(item.qty) || 0;
                    });
                }
            });

            let itemsRows = '';
            const itemKeys = Object.keys(itemMap);

            itemKeys.forEach(pid => {
                const item = itemMap[pid];
                const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === pid.toLowerCase()) : null;
                let prodName = prod ? prod.name : 'ไม่ระบุชื่อสินค้า';
                let unit = (prod && prod.unit) ? prod.unit : 'ชิ้น';

                if (po && String(po.productId).trim().toLowerCase() === pid.toLowerCase()) {
                    prodName = po.productName || prodName;
                }

                let orderedQtyStr = '-';
                let pendingQtyStr = '-';
                if (po) {
                    const ordVal = parseFloat(po.orderedQty) || 0;
                    const recVal = parseFloat(po.receivedQty) || 0;
                    orderedQtyStr = ordVal + ' ' + unit;
                    const pendingVal = Math.max(0, ordVal - recVal);
                    pendingQtyStr = pendingVal + ' ' + unit;
                }

                itemsRows += '<tr>'
                    + '<td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;font-size:12px;font-family:monospace;font-weight:bold;">' + escapeHTML(pid) + '<\/td>'
                    + '<td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;font-size:12px;">' + escapeHTML(prodName) + '<\/td>'
                    + '<td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;">' + orderedQtyStr + '<\/td>'
                    + '<td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;font-weight:bold;color:#059669;">' + item.qty + ' ' + unit + '<\/td>'
                    + '<td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-size:12px;font-weight:bold;color:#e11d48;">' + pendingQtyStr + '<\/td>'
                    + '<\/tr>';
            });

            const txIdsStr = matchingTxs.map(t => t.id).join(', ');
            const requestersStr = [...new Set(matchingTxs.map(t => t.requester).filter(Boolean))].join(', ');
            const departmentsStr = [...new Set(matchingTxs.map(t => t.department).filter(Boolean))].join(', ');

            const tableHeaderHtml = '<tr>'
                + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:left;">รหัสสินค้า<\/th>'
                + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:left;">ชื่อรายการสินค้า<\/th>'
                + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:100px;">จำนวนสั่งซื้อ<\/th>'
                + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:110px;">จำนวนที่รับรวม<\/th>'
                + '<th style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;width:100px;">จำนวนค้างรับ<\/th>'
                + '<\/tr>';

            const metaLeftHtml = '<div class="meta-row"><span class="meta-label">เลขที่ PO:<\/span> ' + escapeHTML(poNum || '-') + '<\/div>'
                + '<div class="meta-row"><span class="meta-label">เลขที่ใบรับเข้า:<\/span> ' + escapeHTML(txIdsStr) + '<\/div>'
                + '<div class="meta-row"><span class="meta-label">วันที่ทำรายการล่าสุด:<\/span> ' + escapeHTML(formattedLatestDate) + '<\/div>'
                + '<div class="meta-row"><span class="meta-label">เลขที่ PR:<\/span> ' + escapeHTML((po && po.prNumber) ? po.prNumber : '-') + '<\/div>';

            const metaRightHtml = '<div class="meta-row"><span class="meta-label">พนักงานผู้ทำรายการ:<\/span> ' + escapeHTML(requestersStr || '-') + '<\/div>'
                + '<div class="meta-row"><span class="meta-label">สังกัดฝ่าย/แผนก:<\/span> ' + escapeHTML(departmentsStr || '-') + '<\/div>';

            const css = '* { margin:0; padding:0; box-sizing:border-box; }'
                + '@page { size:A4 portrait; margin: 5mm; }'
                + 'body { font-family:Sarabun,sans-serif; font-size:13px; color:#222; background:#fff; }'
                + '.page-wrapper { width:100%; display:flex; flex-direction:column; min-height:calc(297mm - 10mm); }'
                + '.content-grow { flex-grow:1; }'
                + '.doc-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; }'
                + '.logo-block { flex:0 0 130px; text-align:left; }'
                + '.logo-block img { max-width:120px; max-height:60px; object-fit:contain; }'
                + '.company-block { flex:1; text-align:center; padding:0 20px; }'
                + '.company-name-th { font-size:14px; font-weight:700; }'
                + '.company-name-en { font-size:11px; font-weight:600; color:#444; margin-top:2px; }'
                + '.company-address { font-size:10px; color:#555; line-height:1.5; margin-top:4px; }'
                + '.company-contact { font-size:10px; color:#555; margin-top:4px; }'
                + '.doc-title-bar { text-align:center; font-size:14px; font-weight:700; border-top:1.5px solid #222; border-bottom:1.5px solid #222; padding:5px 0; margin:8px 0 12px 0; }'
                + '.meta-grid { display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; }'
                + '.meta-right { text-align:right; }'
                + '.meta-row { margin-bottom:2px; }'
                + '.meta-label { font-weight:600; }'
                + 'table.items-table { width:100%; border-collapse:collapse; margin-top:10px; }'
                + 'table.items-table th { background:#f5f5f5; border-top:1px solid #ccc; border-bottom:1px solid #ccc; }'
                + '.summary-box { margin-top:12px; padding:8px 12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:4px; text-align:right; font-weight:bold; font-size:13px; }'
                + '.signature-grid { display:flex; justify-content:space-between; margin-top:30px; font-size:11px; text-align:center; }'
                + '.sig-box { flex:1; margin:0 10px; border-top:1px dashed #999; padding-top:40px; }';

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ใบรับเข้าสินค้า - PO: ${escapeHTML(poNum || txIdsStr)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
    <style>${css}</style>
</head>
<body>
    <div class="page-wrapper">
        <div class="content-grow">
            <div class="doc-header">
                <div class="logo-block">
                    <img src="${logoUrl}" alt="Logo">
                </div>
                <div class="company-block">
                    <div class="company-name-th">${companyNameTh}</div>
                    <div class="company-name-en">${companyNameEn}</div>
                    <div class="company-address">${companyAddressTh}<br>${companyAddressEn}</div>
                    <div class="company-contact">${companyContact} | ${companyWebsite} | ${companyTaxId}</div>
                </div>
            </div>

            <div class="doc-title-bar">ใบรับเข้าสินค้า (Goods Receiving Slip)</div>

            <div class="meta-grid">
                <div class="meta-left">${metaLeftHtml}</div>
                <div class="meta-right">${metaRightHtml}</div>
            </div>

            <table class="items-table">
                <thead>${tableHeaderHtml}</thead>
                <tbody>${itemsRows}</tbody>
            </table>
        </div>

        <div class="signature-grid">
            <div class="sig-box">ผู้ทำรายการรับเข้า<br><br>(${escapeHTML(requestersStr || '...........................................')})</div>
            <div class="sig-box">ผู้ตรวจสอบ / เจ้าหน้าที่คลัง<br><br>(...........................................)</div>
            <div class="sig-box">ผู้อนุมัติ<br><br>(...........................................)</div>
        </div>
    </div>
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`;

            doc.open();
            doc.write(htmlContent);
            doc.close();
        };

        window.deleteSingleReceiveGroup = async function(poKey) {
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบประวัติรายการรับเข้านี้?',
                text: `คุณกำลังจะลบรายการรับเข้า ${poKey} ออกจากประวัติรับเข้าคลังอย่างถาวร การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, ลบเลย!',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });

            if (!confirmResult.isConfirmed) return;

            showLoading("กำลังลบรายการประวัติการรับเข้า...");
            try {
                let poNum = "";
                let matchingTxs = [];
                let receiveTx = transactions.filter(t => t.status === 'Restock' || t.machine_id === 'PO_RECEIVE' || t.machine_id === 'RESTOCK');

                if (poKey.startsWith("PO:")) {
                    poNum = poKey.replace("PO:", "").trim();
                } else if (poKey.startsWith("TX:")) {
                    const txId = poKey.replace("TX:", "").trim();
                    matchingTxs = receiveTx.filter(t => t.id === txId);
                } else {
                    poNum = poKey.trim();
                }

                if (poNum) {
                    matchingTxs = receiveTx.filter(t => {
                        let p = "";
                        if (t.note) {
                            if (t.note.startsWith("รับสินค้าจาก PO ")) {
                                p = t.note.replace("รับสินค้าจาก PO ", "").trim();
                            } else if (t.note.startsWith("รับสินค้าfrom PO ")) {
                                p = t.note.replace("รับสินค้าfrom PO ", "").trim();
                            } else {
                                const match = t.note.match(/PO[-:\s]*([A-Za-z0-9\-_]+)/i);
                                if (match && match[1]) p = match[1];
                            }
                        }
                        return String(p).trim() === String(poNum).trim() || String(t.id).trim() === String(poNum).trim();
                    });
                }

                if (matchingTxs.length === 0) {
                    showToast("ไม่พบรายการรับเข้าเพื่อทำการลบ", "warning");
                    hideLoading();
                    return;
                }

                const snapshot = await firebase.database().ref('transactions').get();
                let allTxs = ensureArray(snapshot.val());
                const removeIds = matchingTxs.map(t => String(t.id).trim());

                allTxs = allTxs.filter(t => !removeIds.includes(String(t.id).trim()));

                await firebase.database().ref('transactions').set(allTxs);
                db.transactions = allTxs;
                transactions = allTxs;
                transactionsCache = null;
                invalidateLocalCache();

                showToast("ลบประวัติรายการรับเข้าสำเร็จ", "success");
                renderReceiveHistoryTable();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        window.deleteAllReceiveHistory = async function() {
            const confirmResult = await Swal.fire({
                title: 'ต้องการลบประวัติการรับเข้าทั้งหมดจริงหรือ?',
                text: 'ข้อมูลประวัติการรับเข้าสินค้าคลังทั้งหมดจะถูกลบออกจากระบบอย่างถาวร การดำเนินการนี้ไม่สามารถย้อนกลับได้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันลบทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });

            if (!confirmResult.isConfirmed) return;

            const finalConfirm = await Swal.fire({
                title: 'กรุณายืนยันอีกครั้ง',
                text: 'ป้อนคำว่า "DELETE ALL" เพื่อยืนยันการลบประวัติรับเข้าทั้งหมดอย่างถาวร',
                input: 'text',
                inputPlaceholder: 'DELETE ALL',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันลบข้อมูลทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                inputValidator: (value) => {
                    if (value !== 'DELETE ALL') {
                        return 'คำยืนยันไม่ถูกต้อง!';
                    }
                }
            });

            if (!finalConfirm.isConfirmed) return;

            showLoading("กำลังลบประวัติการรับเข้าทั้งหมด...");
            try {
                const snapshot = await firebase.database().ref('transactions').get();
                let allTxs = ensureArray(snapshot.val());

                allTxs = allTxs.filter(t => !(t.status === 'Restock' || t.machine_id === 'PO_RECEIVE' || t.machine_id === 'RESTOCK'));

                await firebase.database().ref('transactions').set(allTxs);
                db.transactions = allTxs;
                transactions = allTxs;
                transactionsCache = null;
                invalidateLocalCache();

                showToast("ลบประวัติการรับเข้าทั้งหมดสำเร็จ", "success");
                renderReceiveHistoryTable();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        window.deleteSingleHistoryRecord = async function(poNumber, productId) {
            const confirmResult = await Swal.fire({
                title: 'ยืนยันการลบประวัติรายการนี้?',
                text: `คุณกำลังจะลบรายการสั่งซื้อเลขที่ PO: ${poNumber} ออกจากประวัติจัดซื้ออย่างถาวร การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ใช่, ลบเลย!',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });
            
            if (!confirmResult.isConfirmed) return;
            
            showLoading("กำลังลบรายการประวัติ...");
            try {
                const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
                let purchaseOrders = ensureArray(snapshot.val());
                
                purchaseOrders = purchaseOrders.filter(o => !(String(o.poNumber).trim() === String(poNumber).trim() && String(o.productId).trim() === String(productId).trim()));
                
                await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
                db.purchaseOrders = purchaseOrders;
                invalidateLocalCache();
                
                showToast("ลบประวัติรายการสำเร็จ", "success");
                renderPurchaseHistoryCards();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        window.deleteAllPurchaseHistory = async function() {
            const confirmResult = await Swal.fire({
                title: 'ต้องการลบประวัติทั้งหมดจริงหรือ?',
                text: 'ข้อมูลใบสั่งซื้อที่มีสถานะ "สั่งแล้ว", "ได้รับครบ", และ "ค้างส่ง" ทั้งหมดจะถูกลบออกจากระบบอย่างถาวร การดำเนินการนี้จะไม่ลบรายการที่เป็น "ดราฟต์" หรือ "รออนุมัติ"',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'ยืนยันลบทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                }
            });
            
            if (!confirmResult.isConfirmed) return;

            const finalConfirm = await Swal.fire({
                title: 'กรุณายืนยันอีกครั้ง',
                text: 'ป้อนคำว่า "DELETE ALL" เพื่อยืนยันการลบประวัติจัดซื้อทั้งหมดอย่างถาวร',
                input: 'text',
                inputPlaceholder: 'DELETE ALL',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ลบข้อมูลประวัติทั้งหมด',
                cancelButtonText: 'ยกเลิก',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl font-semibold !text-xs',
                    cancelButton: 'rounded-xl font-semibold !text-xs',
                },
                preConfirm: (value) => {
                    if (value !== 'DELETE ALL') {
                        Swal.showValidationMessage('กรุณาป้อนคำยืนยันให้ถูกต้อง');
                        return false;
                    }
                    return true;
                }
            });

            if (!finalConfirm.isConfirmed) return;
            
            showLoading("กำลังลบประวัติจัดซื้อทั้งหมด...");
            try {
                const snapshot = await firebase.database().ref('appData/purchaseOrders').get();
                let purchaseOrders = ensureArray(snapshot.val());
                
                // Keep only orders that are NOT in history statuses
                purchaseOrders = purchaseOrders.filter(o => o.status !== "สั่งแล้ว" && o.status !== "ได้รับครบ" && o.status !== "ค้างส่ง");
                
                await firebase.database().ref('appData/purchaseOrders').set(purchaseOrders);
                db.purchaseOrders = purchaseOrders;
                invalidateLocalCache();
                
                showToast("ลบประวัติจัดซื้อทั้งหมดสำเร็จ", "success");
                renderPurchaseHistoryCards();
            } catch (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message, "error");
            }
            hideLoading();
        };

        window.exportPurchaseHistoryToExcel = function() {
            const orders = db.purchaseOrders || [];
            const products = db.products || [];

            // Filter orders: only ordered items (exclude drafts, wait-for-approvals)
            let processedOrders = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง");

            if (purchaseHistorySearchQuery) {
                processedOrders = processedOrders.filter(o => 
                    String(o.poNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.prNumber || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.productId || '').toLowerCase().includes(purchaseHistorySearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(purchaseHistorySearchQuery)
                );
            }

            if (purchaseHistoryCategoryFilter || purchaseHistoryGroupFilter) {
                processedOrders = processedOrders.filter(o => {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    if (!prod) return false;
                    if (purchaseHistoryCategoryFilter && prod.category !== purchaseHistoryCategoryFilter) return false;
                    if (purchaseHistoryGroupFilter && prod.group !== purchaseHistoryGroupFilter) return false;
                    return true;
                });
            }

            if (processedOrders.length === 0) {
                showToast("ไม่พบข้อมูลประวัติใบสั่งซื้อสำหรับการส่งออก", "warning");
                return;
            }

            const data = processedOrders.map(o => {
                const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                const unit = prod ? (prod.unit || 'ชิ้น') : 'ชิ้น';
                const supplier = o.supplier || (prod ? (prod.supplier || 'ไม่ระบุ') : 'ไม่ระบุ');
                const ordered = parseFloat(o.orderedQty) || 0;
                const received = parseFloat(o.receivedQty) || 0;
                const pending = Math.max(0, ordered - received);

                return {
                    "เลข PO": o.poNumber || '-',
                    "เลข PR": o.prNumber || '-',
                    "วันที่สั่งซื้อ": formatDateTimeThai(o.orderDate),
                    "รหัสสินค้า": String(o.productId || '-'),
                    "ชื่อสินค้า": o.productName || (prod ? prod.name : '-'),
                    "จำนวนที่สั่ง": ordered,
                    "จำนวนที่รับแล้ว": received,
                    "จำนวนค้างส่ง": pending,
                    "หน่วย": unit,
                    "ซัพพลายเออร์": supplier,
                    "สถานะ": o.status || '-'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ประวัติการสั่งซื้อ");

            worksheet["!cols"] = [
                { wch: 18 }, // เลข PO
                { wch: 15 }, // เลข PR
                { wch: 14 }, // วันที่สั่งซื้อ
                { wch: 15 }, // รหัสสินค้า
                { wch: 30 }, // ชื่อสินค้า
                { wch: 14 }, // จำนวนที่สั่ง
                { wch: 16 }, // จำนวนที่รับแล้ว
                { wch: 14 }, // จำนวนค้างส่ง
                { wch: 10 }, // หน่วย
                { wch: 22 }, // ซัพพลายเออร์
                { wch: 12 }  // สถานะ
            ];

            const today = new Date();
            const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
            
            XLSX.writeFile(workbook, `Purchase_History_${dateStr}.xlsx`);
            showToast("ส่งออกข้อมูลประวัติการสั่งซื้อสำเร็จ", "success");
        };

        window.exportReceiveHistoryToExcel = function() {
            const searchInput = document.getElementById('searchReceiveHistoryInput');
            const searchKeyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

            const grouped = {};

            const purchaseOrders = (db && Array.isArray(db.purchaseOrders)) ? db.purchaseOrders : [];
            purchaseOrders.forEach(po => {
                if (!po || !po.poNumber) return;
                const poNum = String(po.poNumber).trim();
                const groupKey = "PO:" + poNum;
                grouped[groupKey] = {
                    poNumber: poNum,
                    txId: poNum,
                    isPo: true,
                    transactions: [],
                    totalQty: parseFloat(po.receivedQty) || 0,
                    latestDate: po.lastReceivedDate || po.orderDate || ''
                };
            });

            let receiveTx = (transactions || []).filter(t => t.status === 'Restock' || t.machine_id === 'PO_RECEIVE' || t.machine_id === 'RESTOCK');

            receiveTx.forEach(t => {
                let poNum = "";
                if (t.note) {
                    if (t.note.startsWith("รับสินค้าจาก PO ")) {
                        poNum = t.note.replace("รับสินค้าจาก PO ", "").trim();
                    } else if (t.note.startsWith("รับสินค้าfrom PO ")) {
                        poNum = t.note.replace("รับสินค้าfrom PO ", "").trim();
                    } else {
                        const match = t.note.match(/PO[-:\s]*([A-Za-z0-9\-_]+)/i);
                        if (match && match[1]) poNum = match[1];
                    }
                }

                const groupKey = poNum ? ("PO:" + poNum) : ("TX:" + (t.id || 'RESTOCK'));

                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        poNumber: poNum || '',
                        txId: t.id || poNum || '',
                        isPo: !!poNum,
                        transactions: [],
                        totalQty: 0,
                        latestDate: ''
                    };
                }

                if (!grouped[groupKey].transactions.some(existing => existing.id === t.id)) {
                    grouped[groupKey].transactions.push(t);
                }

                const d = t.date || t.created_at || '';
                if (d > grouped[groupKey].latestDate) {
                    grouped[groupKey].latestDate = d;
                }
            });

            Object.values(grouped).forEach(g => {
                if (g.transactions && g.transactions.length > 0) {
                    let tQty = 0;
                    g.transactions.forEach(t => {
                        if (t.items && t.items.length > 0) {
                            t.items.forEach(item => {
                                tQty += parseFloat(item.qty) || 0;
                            });
                        }
                    });
                    g.totalQty = tQty;
                }
            });

            let receiveGroups = Object.values(grouped);

            if (searchKeyword) {
                receiveGroups = receiveGroups.filter(g => {
                    if (g.poNumber && String(g.poNumber).toLowerCase().includes(searchKeyword)) return true;
                    if (g.txId && String(g.txId).toLowerCase().includes(searchKeyword)) return true;
                    
                    const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                    const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                    const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                    let productId = firstItem ? firstItem.product_id : '';
                    if (po && po.productId) productId = po.productId;
                    const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                    const supplierName = (po && po.supplier) ? po.supplier : (prod && prod.supplier ? prod.supplier : '');
                    if (supplierName && supplierName.toLowerCase().includes(searchKeyword)) return true;
                    return false;
                });
            }

            // Apply Category and Group filters
            if (receiveHistoryCategoryFilter || receiveHistoryGroupFilter) {
                receiveGroups = receiveGroups.filter(g => {
                    const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                    const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                    const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                    let productId = firstItem ? firstItem.product_id : '';
                    if (po && po.productId) productId = po.productId;
                    
                    const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                    if (!prod) return false;
                    
                    if (receiveHistoryCategoryFilter && prod.category !== receiveHistoryCategoryFilter) return false;
                    if (receiveHistoryGroupFilter && prod.group !== receiveHistoryGroupFilter) return false;
                    return true;
                });
            }

            if (receiveGroups.length === 0) {
                showToast("ไม่พบข้อมูลประวัติการรับเข้าสำหรับการส่งออก", "warning");
                return;
            }

            const data = receiveGroups.map(g => {
                const po = g.poNumber ? (db.purchaseOrders ? db.purchaseOrders.find(o => String(o.poNumber).trim() === g.poNumber) : null) : null;
                const firstTx = g.transactions && g.transactions[0] ? g.transactions[0] : null;
                const firstItem = firstTx && firstTx.items && firstTx.items[0] ? firstTx.items[0] : null;
                let productId = firstItem ? firstItem.product_id : '';
                let productName = 'ไม่พบชื่อสินค้า';
                let unit = 'ชิ้น';
                if (po && po.productId) productId = po.productId;
                const prod = db.products ? db.products.find(p => String(p.id).trim().toLowerCase() === String(productId).trim().toLowerCase()) : null;
                if (prod) {
                    productName = prod.name;
                    unit = prod.unit || 'ชิ้น';
                }
                if (po && po.productName) productName = po.productName;
                const supplierName = (po && po.supplier) ? po.supplier : (prod && prod.supplier ? prod.supplier : 'ไม่ระบุ');

                return {
                    "เลข PO / รหัสใบรับ": g.poNumber || g.txId || '-',
                    "วันที่ทำรายการล่าสุด": formatDateTimeThai(g.latestDate),
                    "ซัพพลายเออร์": supplierName,
                    "ชื่อสินค้า": productName,
                    "รหัสสินค้า": String(productId || '-'),
                    "จำนวนรับเข้าทั้งหมด": g.totalQty,
                    "หน่วย": unit
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ประวัติการรับเข้าคลัง");

            worksheet["!cols"] = [
                { wch: 20 }, // เลข PO / รหัสใบรับ
                { wch: 20 }, // วันที่ทำรายการล่าสุด
                { wch: 25 }, // ซัพพลายเออร์
                { wch: 30 }, // ชื่อสินค้า
                { wch: 15 }, // รหัสสินค้า
                { wch: 18 }, // จำนวนรับเข้าทั้งหมด
                { wch: 10 }  // หน่วย
            ];

            const today = new Date();
            const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
            
            XLSX.writeFile(workbook, `Receive_History_${dateStr}.xlsx`);
            showToast("ส่งออกข้อมูลประวัติการรับเข้าสำเร็จ", "success");
        };

        let purchaseOverviewProducts = [];
        let purchaseOverviewSuppliers = [];

        window.toggleOverviewMonth = function(monthVal, btn) {
            const idx = purchaseOverviewSelectedMonths.indexOf(monthVal);
            if (idx === -1) {
                purchaseOverviewSelectedMonths.push(monthVal);
                btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
            } else {
                purchaseOverviewSelectedMonths.splice(idx, 1);
                btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
            }
            renderPurchaseOverviewDashboard();
        };

        window.toggleOverviewYear = function(yearVal, btn) {
            const idx = purchaseOverviewSelectedYears.indexOf(yearVal);
            if (idx === -1) {
                purchaseOverviewSelectedYears.push(yearVal);
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
            } else {
                purchaseOverviewSelectedYears.splice(idx, 1);
                btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
            }
            renderPurchaseOverviewDashboard();
        };

        window.selectOverviewAllMonths = function(selectBool) {
            const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            purchaseOverviewSelectedMonths = [];
            monthNames.forEach((name, index) => {
                const monthVal = String(index + 1).padStart(2, '0');
                const btn = document.getElementById(`btn-overview-month-${monthVal}`);
                if (!btn) return;
                if (selectBool) {
                    purchaseOverviewSelectedMonths.push(monthVal);
                    btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
                } else {
                    btn.className = "px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
                }
            });
            renderPurchaseOverviewDashboard();
        };

        window.selectOverviewAllYears = function(selectBool) {
            const orders = db.purchaseOrders || [];
            const yearsList = [...new Set(orders.map(o => o.orderDate ? o.orderDate.split('-')[0] : '').filter(Boolean))].sort();
            if (yearsList.length === 0) {
                yearsList.push(new Date().getFullYear().toString());
            }
            purchaseOverviewSelectedYears = [];
            yearsList.forEach(y => {
                const btn = document.getElementById(`btn-overview-year-${y}`);
                if (!btn) return;
                if (selectBool) {
                    purchaseOverviewSelectedYears.push(y);
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-500 bg-blue-600 text-white transition active:scale-95 shadow-sm";
                } else {
                    btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm";
                }
            });
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewSearch = function(val) {
            purchaseOverviewSearchQuery = val.trim().toLowerCase();
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewCategory = function(val) {
            purchaseOverviewCategoryFilter = val.trim();
            renderPurchaseOverviewDashboard();
        };

        window.handleOverviewGroup = function(val) {
            purchaseOverviewGroupFilter = val.trim();
            renderPurchaseOverviewDashboard();
        };

        window.renderPurchaseOverviewDashboard = function() {
            const statCardsContainer = document.getElementById('overview-stat-cards');
            const chartContainer = document.getElementById('overview-chart-container');
            const monthlyComparisonList = document.getElementById('overview-monthly-comparison-list');
            const topProductDowns = document.getElementById('top-product-downs');
            const topProductUps = document.getElementById('top-product-ups');
            const topSupplierDowns = document.getElementById('top-supplier-downs');
            const topSupplierUps = document.getElementById('top-supplier-ups');
            const drillProductSelect = document.getElementById('overview-drill-product-select');
            const drillSupplierSelect = document.getElementById('overview-drill-supplier-select');

            if (!statCardsContainer) return;

            const orders = db.purchaseOrders || [];
            const products = db.products || [];

            // Filter orders: only ordered items (exclude drafts, wait-for-approvals)
            let activeOrders = orders.filter(o => o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง");

            // Filter by search query (match Product ID or Product Name)
            if (purchaseOverviewSearchQuery) {
                activeOrders = activeOrders.filter(o => 
                    String(o.productId || '').toLowerCase().includes(purchaseOverviewSearchQuery) ||
                    String(o.productName || '').toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }

            // Filter by Category and Group
            if (purchaseOverviewCategoryFilter || purchaseOverviewGroupFilter) {
                activeOrders = activeOrders.filter(o => {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    if (!prod) return false;
                    if (purchaseOverviewCategoryFilter && prod.category !== purchaseOverviewCategoryFilter) return false;
                    if (purchaseOverviewGroupFilter && prod.group !== purchaseOverviewGroupFilter) return false;
                    return true;
                });
            }

            // Filter by selected Years and Months
            activeOrders = activeOrders.filter(o => {
                if (!o.orderDate || o.orderDate.length < 7) return false;
                const year = o.orderDate.split('-')[0];
                const month = o.orderDate.split('-')[1];
                
                if (purchaseOverviewSelectedYears.length > 0 && !purchaseOverviewSelectedYears.includes(year)) return false;
                if (purchaseOverviewSelectedMonths.length > 0 && !purchaseOverviewSelectedMonths.includes(month)) return false;
                return true;
            });

            // Calculate core stats
            const orderCount = activeOrders.length;
            let totalOrderedValue = 0;
            let totalReceivedValue = 0;

            activeOrders.forEach(o => {
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                totalOrderedValue += (o.orderedQty * cost);
                totalReceivedValue += (o.receivedQty * cost);
            });

            // Render Core Stat Cards
            statCardsContainer.innerHTML = `
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-file-invoice-dollar text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">จำนวนครั้งที่สั่งซื้อ</span>
                        <span class="font-extrabold text-slate-800 text-xl">${orderCount.toLocaleString()} ครั้ง</span>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-cart-shopping text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">มูลค่ารวมตามสั่งซื้อ</span>
                        <span class="font-extrabold text-amber-600 text-xl">฿${totalOrderedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center gap-4 animate-fade-in">
                    <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid fa-clipboard-check text-xl"></i>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">มูลค่ารวมได้รับจริง</span>
                        <span class="font-extrabold text-emerald-600 text-xl">฿${totalReceivedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>
            `;

            // Month-by-month stats comparison
            const monthlyData = {};
            activeOrders.forEach(o => {
                if (!o.orderDate || o.orderDate.length < 7) return;
                const key = o.orderDate.substring(0, 7); // "YYYY-MM"
                if (!monthlyData[key]) {
                    monthlyData[key] = {
                        count: 0,
                        orderedVal: 0,
                        receivedVal: 0
                    };
                }
                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                monthlyData[key].count++;
                monthlyData[key].orderedVal += (o.orderedQty * cost);
                monthlyData[key].receivedVal += (o.receivedQty * cost);
            });

            const sortedMonths = Object.keys(monthlyData).sort();

            function getChangePct(curr, prev) {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            }

            let monthlyComparisonsHtml = '';
            for (let i = 0; i < sortedMonths.length; i++) {
                const monthKey = sortedMonths[i];
                const data = monthlyData[monthKey];
                
                const [year, month] = monthKey.split('-');
                const monthNamesShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const monthNameTh = monthNamesShort[parseInt(month) - 1] + ' ' + (parseInt(year) + 543);

                let prevCount = 0;
                let prevOrdered = 0;
                let prevReceived = 0;
                if (i > 0) {
                    const prevKey = sortedMonths[i - 1];
                    prevCount = monthlyData[prevKey].count;
                    prevOrdered = monthlyData[prevKey].orderedVal;
                    prevReceived = monthlyData[prevKey].receivedVal;
                }

                const countChange = getChangePct(data.count, prevCount);
                const orderedChange = getChangePct(data.orderedVal, prevOrdered);
                const receivedChange = getChangePct(data.receivedVal, prevReceived);

                function formatBadge(pct) {
                    if (i === 0) return `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">-</span>`;
                    if (pct > 0.05) {
                        return `<span class="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5 font-mono"><i class="fa-solid fa-arrow-trend-up"></i> +${pct.toFixed(1)}%</span>`;
                    } else if (pct < -0.05) {
                        return `<span class="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5 font-mono"><i class="fa-solid fa-arrow-trend-down"></i> ${pct.toFixed(1)}%</span>`;
                    } else {
                        return `<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold font-mono">0.0%</span>`;
                    }
                }

                monthlyComparisonsHtml += `
                    <div class="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-2">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span class="font-bold text-slate-700 text-xs">${monthNameTh}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">สั่งซื้อ</span>
                                <span class="font-bold text-slate-800 text-[11px] block">${data.count} ครั้ง</span>
                                ${formatBadge(countChange)}
                            </div>
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">ยอดสั่งซื้อ</span>
                                <span class="font-bold text-slate-800 text-[11px] block truncate" title="฿${data.orderedVal.toLocaleString()}">฿${data.orderedVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                ${formatBadge(orderedChange)}
                            </div>
                            <div>
                                <span class="text-[9px] text-slate-400 block font-semibold">ได้รับจริง</span>
                                <span class="font-bold text-slate-800 text-[11px] block truncate" title="฿${data.receivedVal.toLocaleString()}">฿${data.receivedVal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                ${formatBadge(receivedChange)}
                            </div>
                        </div>
                    </div>
                `;
            }

            if (sortedMonths.length === 0) {
                monthlyComparisonList.innerHTML = `
                    <div class="text-center py-8 text-slate-400 text-xs">
                        <i class="fa-solid fa-folder-open text-2xl mb-2 text-slate-300"></i>
                        <p>ไม่มีข้อมูลเปรียบเทียบในรายเดือน</p>
                    </div>
                `;
            } else {
                monthlyComparisonList.innerHTML = monthlyComparisonsHtml;
            }

            // Draw SVG Line Chart
            if (sortedMonths.length === 0) {
                chartContainer.innerHTML = `
                    <div class="text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-chart-line text-3xl mb-2 text-slate-300"></i>
                        <p>ไม่มีข้อมูลประวัติสำหรับวาดกราฟ</p>
                    </div>
                `;
            } else {
                const w = 550;
                const h = 250;
                const paddingLeft = 60;
                const paddingRight = 20;
                const paddingTop = 30;
                const paddingBottom = 40;

                const chartWidth = w - paddingLeft - paddingRight;
                const chartHeight = h - paddingTop - paddingBottom;

                let maxVal = 1000;
                sortedMonths.forEach(k => {
                    const d = monthlyData[k];
                    if (d.orderedVal > maxVal) maxVal = d.orderedVal;
                    if (d.receivedVal > maxVal) maxVal = d.receivedVal;
                });
                const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
                const step = magnitude / 2 || 100;
                maxVal = Math.ceil(maxVal / step) * step;

                const gridCount = 4;
                let yGridHtml = '';
                for (let idx = 0; idx <= gridCount; idx++) {
                    const ratio = idx / gridCount;
                    const val = maxVal * ratio;
                    const y = h - paddingBottom - (ratio * chartHeight);
                    let formattedVal = val.toLocaleString(undefined, {maximumFractionDigits: 0});
                    if (val >= 1000000) {
                        formattedVal = (val / 1000000).toFixed(1) + 'M';
                    } else if (val >= 1000) {
                        formattedVal = (val / 1000).toFixed(0) + 'K';
                    }
                    yGridHtml += `
                        <line x1="${paddingLeft}" y1="${y}" x2="${w - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
                        <text x="${paddingLeft - 8}" y="${y + 4}" fill="#64748b" font-size="9" text-anchor="end" font-family="sans-serif">${formattedVal}</text>
                    `;
                }

                let xGridHtml = '';
                const pointsOrdered = [];
                const pointsReceived = [];

                sortedMonths.forEach((k, idx) => {
                    const d = monthlyData[k];
                    let x = paddingLeft;
                    if (sortedMonths.length > 1) {
                        x += (idx / (sortedMonths.length - 1)) * chartWidth;
                    } else {
                        x += chartWidth / 2;
                    }

                    const yOrdered = h - paddingBottom - ((d.orderedVal / maxVal) * chartHeight);
                    const yReceived = h - paddingBottom - ((d.receivedVal / maxVal) * chartHeight);

                    pointsOrdered.push({x, y: yOrdered, val: d.orderedVal});
                    pointsReceived.push({x, y: yReceived, val: d.receivedVal});

                    const [year, month] = k.split('-');
                    const shortYr = year.substring(2);
                    const monthNamesShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    const displayLabel = monthNamesShort[parseInt(month) - 1] + shortYr;

                    xGridHtml += `
                        <text x="${x}" y="${h - paddingBottom + 16}" fill="#64748b" font-size="9" text-anchor="middle" font-family="sans-serif">${displayLabel}</text>
                        <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${h - paddingBottom}" stroke="#f1f5f9" stroke-width="1" />
                    `;
                });

                function makePath(points) {
                    if (points.length === 0) return '';
                    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                    let pathStr = `M ${points[0].x} ${points[0].y}`;
                    for (let idx = 1; idx < points.length; idx++) {
                        pathStr += ` L ${points[idx].x} ${points[idx].y}`;
                    }
                    return pathStr;
                }

                const pathOrdered = makePath(pointsOrdered);
                const pathReceived = makePath(pointsReceived);

                let circlesHtml = '';
                pointsOrdered.forEach(p => {
                    circlesHtml += `
                        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5">
                            <title>ตามสั่งซื้อ: ฿${p.val.toLocaleString()}</title>
                        </circle>
                    `;
                });
                pointsReceived.forEach(p => {
                    circlesHtml += `
                        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981" stroke="#ffffff" stroke-width="1.5">
                            <title>ได้รับจริง: ฿${p.val.toLocaleString()}</title>
                        </circle>
                    `;
                });

                chartContainer.innerHTML = `
                    <svg viewBox="0 0 ${w} ${h}" class="w-full h-full">
                        ${yGridHtml}
                        ${xGridHtml}
                        ${pathOrdered ? `<path d="${pathOrdered}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        ${pathReceived ? `<path d="${pathReceived}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                        ${circlesHtml}
                        <g transform="translate(${paddingLeft}, 12)">
                            <circle cx="5" cy="5" r="4" fill="#3b82f6" />
                            <text x="15" y="8" fill="#1e293b" font-size="9" font-weight="bold" font-family="sans-serif">มูลค่ารวมตามสั่งซื้อ</text>
                            <circle cx="130" cy="5" r="4" fill="#10b981" />
                            <text x="140" y="8" fill="#1e293b" font-size="9" font-weight="bold" font-family="sans-serif">มูลค่ารวมได้รับจริง</text>
                        </g>
                    </svg>
                `;
            }

            // Products Price Analytics
            purchaseOverviewProducts = [];
            products.forEach(p => {
                const prodOrders = orders.filter(o => 
                    String(o.productId).trim() === String(p.id).trim() && 
                    (o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง")
                ).sort((a, b) => (a.orderDate || '').localeCompare(b.orderDate || ''));

                if (prodOrders.length < 2) return;

                const prices = prodOrders.map(o => {
                    let c = parseFloat(o.unitCost) || 0;
                    if (c === 0) c = parseFloat(p.cost) || 0;
                    return c;
                }).filter(c => c > 0);

                if (prices.length < 2) return;

                const firstPrice = prices[0];
                const lastPrice = prices[prices.length - 1];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                const diff = lastPrice - firstPrice;
                const pct = (diff / firstPrice) * 100;
                const volatility = minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100) : 0;

                purchaseOverviewProducts.push({
                    productId: p.id,
                    productName: p.name,
                    category: p.category || '',
                    group: p.group || '',
                    firstPrice,
                    lastPrice,
                    diff,
                    pct,
                    volatility,
                    history: prodOrders.map((o, idx) => ({
                        date: o.orderDate || '-',
                        po: o.poNumber,
                        pr: o.prNumber,
                        qty: o.orderedQty,
                        cost: prices[idx] || 0,
                        supplier: o.supplier || p.supplier || 'ไม่ระบุ'
                    }))
                });
            });

            let filteredProductsAnalysis = purchaseOverviewProducts;
            if (purchaseOverviewSearchQuery) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => 
                    String(x.productId || '').toLowerCase().includes(purchaseOverviewSearchQuery) ||
                    String(x.productName || '').toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }
            if (purchaseOverviewCategoryFilter) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => x.category === purchaseOverviewCategoryFilter);
            }
            if (purchaseOverviewGroupFilter) {
                filteredProductsAnalysis = filteredProductsAnalysis.filter(x => x.group === purchaseOverviewGroupFilter);
            }

            const topUps = [...filteredProductsAnalysis].filter(x => x.diff > 0.01).sort((a, b) => b.pct - a.pct).slice(0, 10);
            const topDowns = [...filteredProductsAnalysis].filter(x => x.diff < -0.01).sort((a, b) => a.pct - b.pct).slice(0, 10);

            topProductDowns.innerHTML = topDowns.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.productName)}">
                        <span class="font-mono text-[9px] text-slate-400 block">${escapeHTML(x.productId)}</span>
                        ${escapeHTML(x.productName)}
                    </td>
                    <td class="p-2 text-right text-emerald-600 font-mono">฿${Math.abs(x.diff).toFixed(1)}</td>
                    <td class="p-2 text-right text-emerald-600 font-bold font-mono">${x.pct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการราคาลดลง</td></tr>`;

            topProductUps.innerHTML = topUps.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.productName)}">
                        <span class="font-mono text-[9px] text-slate-400 block">${escapeHTML(x.productId)}</span>
                        ${escapeHTML(x.productName)}
                    </td>
                    <td class="p-2 text-right text-rose-600 font-mono">฿${x.diff.toFixed(1)}</td>
                    <td class="p-2 text-right text-rose-600 font-bold font-mono">+${x.pct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการราคาเพิ่มขึ้น</td></tr>`;

            // Drill down product select options
            const prevDrillVal = drillProductSelect.value;
            drillProductSelect.innerHTML = '<option value="">เลือกสินค้าเพื่อวิเคราะห์...</option>';
            purchaseOverviewProducts.sort((a, b) => a.productName.localeCompare(b.productName)).forEach(x => {
                const selectedAttr = x.productId === prevDrillVal ? 'selected' : '';
                drillProductSelect.insertAdjacentHTML('beforeend', `
                    <option value="${escapeHTML(x.productId)}" ${selectedAttr}>${escapeHTML(x.productName)} (${escapeHTML(x.productId)})</option>
                `);
            });
            if (prevDrillVal && purchaseOverviewProducts.some(x => x.productId === prevDrillVal)) {
                drillProductPriceTrend(prevDrillVal);
            }

            // Suppliers Price Analytics
            purchaseOverviewSuppliers = [];
            const supplierProducts = {};
            orders.filter(o => 
                o.status === "สั่งแล้ว" || o.status === "ได้รับครบ" || o.status === "ค้างส่ง"
            ).forEach(o => {
                const supplierName = o.supplier || 'ไม่ระบุ';
                if (!supplierProducts[supplierName]) {
                    supplierProducts[supplierName] = {};
                }
                const prodId = o.productId;
                if (!supplierProducts[supplierName][prodId]) {
                    supplierProducts[supplierName][prodId] = [];
                }
                const prod = products.find(p => String(p.id).trim() === String(prodId).trim());
                let c = parseFloat(o.unitCost) || 0;
                if (c === 0 && prod) c = parseFloat(prod.cost) || 0;
                if (c > 0) {
                    supplierProducts[supplierName][prodId].push({
                        date: o.orderDate || '-',
                        price: c,
                        po: o.poNumber,
                        pr: o.prNumber,
                        qty: o.orderedQty,
                        productName: o.productName
                    });
                }
            });

            Object.keys(supplierProducts).forEach(supName => {
                const prodMap = supplierProducts[supName];
                const productsList = Object.keys(prodMap);
                
                let totalPct = 0;
                let totalVol = 0;
                let countCalculated = 0;
                const historyList = [];

                productsList.forEach(prodId => {
                    const priceLogs = prodMap[prodId].sort((a, b) => a.date.localeCompare(b.date));
                    if (priceLogs.length < 2) return;

                    const firstPrice = priceLogs[0].price;
                    const lastPrice = priceLogs[priceLogs.length - 1].price;
                    const minPrice = Math.min(...priceLogs.map(l => l.price));
                    const maxPrice = Math.max(...priceLogs.map(l => l.price));

                    const diff = lastPrice - firstPrice;
                    const pct = (diff / firstPrice) * 100;
                    const volatility = minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100) : 0;

                    totalPct += pct;
                    totalVol += volatility;
                    countCalculated++;

                    priceLogs.forEach(log => {
                        historyList.push({
                            date: log.date,
                            productId: prodId,
                            productName: log.productName,
                            price: log.price,
                            po: log.po,
                            pr: log.pr,
                            qty: log.qty
                        });
                    });
                });

                if (countCalculated > 0) {
                    const avgPct = totalPct / countCalculated;
                    const avgVol = totalVol / countCalculated;

                    purchaseOverviewSuppliers.push({
                        supplierName: supName,
                        avgPct,
                        avgVol,
                        history: historyList.sort((a, b) => a.date.localeCompare(b.date))
                    });
                }
            });

            let filteredSupplierAnalysis = purchaseOverviewSuppliers;
            if (purchaseOverviewSearchQuery) {
                filteredSupplierAnalysis = filteredSupplierAnalysis.filter(x => 
                    String(x.supplierName || '').toLowerCase().includes(purchaseOverviewSearchQuery)
                );
            }

            const topSupUps = [...filteredSupplierAnalysis].filter(x => x.avgPct > 0.01).sort((a, b) => b.avgPct - a.avgPct).slice(0, 10);
            const topSupDowns = [...filteredSupplierAnalysis].filter(x => x.avgPct < -0.01).sort((a, b) => a.avgPct - b.avgPct).slice(0, 10);

            topSupplierDowns.innerHTML = topSupDowns.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.supplierName)}">
                        ${escapeHTML(x.supplierName)}
                    </td>
                    <td class="p-2 text-right text-emerald-600 font-mono">${Math.abs(x.avgPct).toFixed(1)}%</td>
                    <td class="p-2 text-right text-emerald-600 font-bold font-mono">${x.avgPct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการลดลง</td></tr>`;

            topSupplierUps.innerHTML = topSupUps.map(x => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td class="p-2 text-slate-700 font-semibold truncate max-w-[120px]" title="${escapeHTML(x.supplierName)}">
                        ${escapeHTML(x.supplierName)}
                    </td>
                    <td class="p-2 text-right text-rose-600 font-mono">+${x.avgPct.toFixed(1)}%</td>
                    <td class="p-2 text-right text-rose-600 font-bold font-mono">+${x.avgPct.toFixed(1)}%</td>
                </tr>
            `).join('') || `<tr><td colspan="3" class="p-4 text-center text-slate-400">ไม่มีรายการเพิ่มขึ้น</td></tr>`;

            // Drill down supplier select options
            const prevDrillSupVal = drillSupplierSelect.value;
            drillSupplierSelect.innerHTML = '<option value="">เลือก Supplier...</option>';
            purchaseOverviewSuppliers.sort((a, b) => a.supplierName.localeCompare(b.supplierName)).forEach(x => {
                const selectedAttr = x.supplierName === prevDrillSupVal ? 'selected' : '';
                drillSupplierSelect.insertAdjacentHTML('beforeend', `
                    <option value="${escapeHTML(x.supplierName)}" ${selectedAttr}>${escapeHTML(x.supplierName)}</option>
                `);
            });
            if (prevDrillSupVal && purchaseOverviewSuppliers.some(x => x.supplierName === prevDrillSupVal)) {
                drillSupplierPriceTrend(prevDrillSupVal);
            }

            // Product Group Analysis Calculation and Rendering
            const groupData = {};
            let grandTotalOrdered = 0;

            activeOrders.forEach(o => {
                const prod = products.find(p => String(p.id).trim() === String(o.productId).trim());
                const grp = prod ? (prod.group || 'ไม่ระบุ') : 'ไม่ระบุ';
                
                if (!groupData[grp]) {
                    groupData[grp] = {
                        name: grp,
                        count: 0,
                        orderedVal: 0,
                        receivedVal: 0
                    };
                }

                let cost = parseFloat(o.unitCost) || 0;
                if (cost === 0) {
                    cost = prod ? (parseFloat(prod.cost) || 0) : 0;
                }
                const oVal = o.orderedQty * cost;
                const rVal = o.receivedQty * cost;

                groupData[grp].count++;
                groupData[grp].orderedVal += oVal;
                groupData[grp].receivedVal += rVal;
                grandTotalOrdered += oVal;
            });

            const groupList = Object.values(groupData).sort((a, b) => b.orderedVal - a.orderedVal);

            const groupTbody = document.getElementById('overview-group-analysis-tbody');
            if (groupTbody) {
                if (groupList.length === 0) {
                    groupTbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="p-8 text-center text-slate-400 text-xs">
                                <i class="fa-solid fa-folder-open text-xl mb-1 block text-slate-300"></i>
                                ไม่มีข้อมูลสำหรับวิเคราะห์กลุ่มสินค้า
                            </td>
                        </tr>
                    `;
                } else {
                    groupTbody.innerHTML = groupList.map(g => {
                        const pct = grandTotalOrdered > 0 ? (g.orderedVal / grandTotalOrdered * 100) : 0;
                        return `
                            <tr class="hover:bg-slate-50/50 transition">
                                <td class="p-3 font-semibold text-slate-700">${escapeHTML(g.name)}</td>
                                <td class="p-3 text-center text-slate-600 font-bold">${g.count}</td>
                                <td class="p-3 text-right text-slate-800 font-bold font-mono">฿${g.orderedVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="p-3 text-right text-emerald-600 font-bold font-mono">฿${g.receivedVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="p-3 text-center">
                                    <div class="flex items-center gap-2 justify-center">
                                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                            <div class="bg-indigo-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
                                        </div>
                                        <span class="text-[10px] font-bold text-indigo-600 font-mono">${pct.toFixed(1)}%</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        };

        window.drillProductPriceTrend = function(productId) {
            const timelineContainer = document.getElementById('product-drilldown-timeline');
            if (!timelineContainer) return;

            if (!productId) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            const prod = purchaseOverviewProducts.find(x => x.productId === productId);
            if (!prod) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            timelineContainer.classList.remove('hidden');
            let timelineHtml = `
                <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex justify-between">
                    <span>ประวัติราคา: ${escapeHTML(prod.productName)}</span>
                    <span class="text-amber-600">ผันผวนสะสม: ${prod.volatility.toFixed(1)}%</span>
                </div>
            `;

            prod.history.forEach((h, idx) => {
                let diffText = '-';
                if (idx > 0) {
                    const prevCost = prod.history[idx - 1].cost;
                    const change = h.cost - prevCost;
                    const pct = prevCost > 0 ? (change / prevCost * 100) : 0;
                    if (pct > 0.05) {
                        diffText = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-arrow-trend-up"></i> +${pct.toFixed(1)}%</span>`;
                    } else if (pct < -0.05) {
                        diffText = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-arrow-trend-down"></i> ${pct.toFixed(1)}%</span>`;
                    } else {
                        diffText = `<span class="text-slate-400">คงที่</span>`;
                    }
                }

                timelineHtml += `
                    <div class="flex items-center justify-between text-[10px] border-b border-slate-100 py-1.5 last:border-0">
                        <div class="space-y-0.5">
                            <div class="font-semibold text-slate-700">${escapeHTML(formatDateTimeThai(h.date))} &bull; PO: ${escapeHTML(h.po || '-')}</div>
                            <div class="text-slate-400 text-[9px]">คู่ค้า: ${escapeHTML(h.supplier)} &bull; จำนวน: ${h.qty}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-mono font-bold text-slate-800">฿${h.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div>${diffText}</div>
                        </div>
                    </div>
                `;
            });

            timelineContainer.innerHTML = timelineHtml;
        };

        window.drillSupplierPriceTrend = function(supplierName) {
            const timelineContainer = document.getElementById('supplier-drilldown-timeline');
            if (!timelineContainer) return;

            if (!supplierName) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            const sup = purchaseOverviewSuppliers.find(x => x.supplierName === supplierName);
            if (!sup) {
                timelineContainer.classList.add('hidden');
                timelineContainer.innerHTML = '';
                return;
            }

            timelineContainer.classList.remove('hidden');
            let timelineHtml = `
                <div class="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex justify-between">
                    <span>ประวัติราคา: ${escapeHTML(sup.supplierName)}</span>
                    <span class="text-indigo-600">ผันผวนเฉลี่ย: ${sup.avgVol.toFixed(1)}%</span>
                </div>
            `;

            sup.history.forEach(h => {
                timelineHtml += `
                    <div class="flex items-center justify-between text-[10px] border-b border-slate-100 py-1.5 last:border-0">
                        <div class="space-y-0.5">
                            <div class="font-semibold text-slate-700">${escapeHTML(formatDateTimeThai(h.date))} &bull; PO: ${escapeHTML(h.po || '-')}</div>
                            <div class="text-slate-500 font-medium">${escapeHTML(h.productName)} (${escapeHTML(h.productId)})</div>
                        </div>
                        <div class="text-right">
                            <div class="font-mono font-bold text-slate-800">฿${h.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <div class="text-slate-400 text-[9px]">จำนวน: ${h.qty}</div>
                        </div>
                    </div>
                `;
            });

            timelineContainer.innerHTML = timelineHtml;
        };



// ===== Modular Helper Functions for Purchase =====

function updateAllViews() {
    if (typeof renderDashboardOrdersTable === 'function') renderDashboardOrdersTable();
    if (typeof renderDraftOrdersTable === 'function') renderDraftOrdersTable();
    if (typeof renderManageOrdersTable === 'function') renderManageOrdersTable();
    if (typeof renderPurchaseHistoryCards === 'function') renderPurchaseHistoryCards();
    if (typeof renderReceiveTable === 'function') renderReceiveTable();
    
    if (typeof updatePurchaseBadgeCounts === 'function') updatePurchaseBadgeCounts();
    if (typeof populateDatalists === 'function') populateDatalists();
}

function updatePurchaseBadgeCounts() {
    if (!db || !Array.isArray(db.purchaseOrders)) return;

    const receivePendingCount = db.purchaseOrders.filter(o => o.status === "สั่งแล้ว" || o.status === "ค้างส่ง").length;
    const receiveBadge = document.getElementById('count-purchase-receive');
    if (receiveBadge) {
        if (receivePendingCount > 0) {
            receiveBadge.innerText = receivePendingCount;
            receiveBadge.classList.remove('hidden');
        } else {
            receiveBadge.classList.add('hidden');
        }
    }

    const managePendingCount = db.purchaseOrders.filter(o => o.status === "เตรียมสั่ง" || o.status === "รออนุมัติ").length;
    const manageBadge = document.getElementById('count-manage-orders');
    if (manageBadge) {
        if (managePendingCount > 0) {
            manageBadge.innerText = managePendingCount;
            manageBadge.classList.remove('hidden');
        } else {
            manageBadge.classList.add('hidden');
        }
    }
}

function populateDatalists() {
    if (!db) return;
    
    // ประเภทอะไหล่ (Product Categories)
    const productCategories = [...new Set(db.products.map(p => p.category).filter(Boolean))].sort();
    const dlProdCategories = document.getElementById('list_product_categories');
    if (dlProdCategories) {
        dlProdCategories.innerHTML = productCategories.map(c => `<option value="${escapeHTML(c)}">`).join('');
    }
    
    // กลุ่มสินค้า (Product Groups)
    const productGroups = [...new Set(db.products.map(p => p.group).filter(Boolean))].sort();
    const dlProdGroups = document.getElementById('list_product_groups');
    if (dlProdGroups) {
        dlProdGroups.innerHTML = productGroups.map(g => `<option value="${escapeHTML(g)}">`).join('');
    }

    // ซัพพลายเออร์ (Suppliers)
    const productSuppliers = db.products ? db.products.map(p => p.supplier).filter(Boolean) : [];
    const orderSuppliers = db.purchaseOrders ? db.purchaseOrders.map(o => o.supplier).filter(Boolean) : [];
    const machineSuppliers = db.machines ? db.machines.map(m => m.supplier).filter(Boolean) : [];
    const allSuppliers = [...new Set([...productSuppliers, ...orderSuppliers, ...machineSuppliers])].map(s => s.trim()).filter(Boolean).sort();
    
    const dlProdSuppliers = document.getElementById('list_product_suppliers');
    if (dlProdSuppliers) {
        dlProdSuppliers.innerHTML = allSuppliers.map(s => `<option value="${escapeHTML(s)}">`).join('');
    }
}
