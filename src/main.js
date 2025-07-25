
// Группировка струтуры данных data


/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const price = purchase.sale_price || 0;
    const quantity = purchase.quantity || 1;
    const discountFactor = 1 - (purchase.discount || 0) / 100;
    const revenue = price * quantity * discountFactor;

    return +revenue.toFixed(2); // округление 
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const {profit} = seller; 
    if (index === 0) return 150; // Бонус за 1 место
    if (index === 1 || index === 2) return 100; // Бонус за 2 и 3 места
    if (index === total - 1) return 0; // Бонус за все места кроме последнего
    return 50; // Бонус за последнее место
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    if (!data || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    if (!data || !Array.isArray(data.customers) || data.customers.length === 0) {
        throw new Error('Некорректные входные данные');
    }
    if (!data || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Чего-то не хватает');
    }

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(data.sellers.map(seller => [seller.id, {
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {} // { sku: quantity }
    }]));

    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // Перебор чеков и обновление статистики продавцов
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return; // если продавец не найден

        seller.sales_count += 1;

        let totalReceiptRevenue = 0;
        let totalReceiptCost = 0;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return; // если товар не найден

            const quantity = item.quantity || 1;
            const discount = 1 - (item.discount || 0) / 100;

            const revenue = calculateRevenue({
                sale_price: item.sale_price,
                quantity,
                discount: (item.discount || 0)
            });

            const cost = (product.purchase_price || 0) * quantity;

            seller.profit += revenue - cost;
            totalReceiptRevenue += revenue;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += quantity;
        });

        seller.revenue += totalReceiptRevenue;
    });

    // Сортировка по прибыли
    const sellerStats = Object.values(sellerIndex).sort((a, b) => b.profit - a.profit);

    // Назначение бонусов и топ-10 товаров
    sellerStats.forEach((seller, index) => {
        const bonusPercent = calculateBonus(index, sellerStats.length, seller);
        seller.bonus = +(seller.profit * bonusPercent).toFixed(2);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Итоговый отчёт
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +(seller.bonus / 1000).toFixed(2)
    }));
}
