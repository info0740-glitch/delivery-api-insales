// delivery.js (минимальная версия для теста)
console.log("🚀 delivery.js (минимальная версия) загружен для способа доставки 'тест'");

// Проверяем, что jQuery и InSales API доступны
if (typeof $ !== 'undefined' && typeof $.fn.triggerCustom !== 'undefined') {
    console.log("✅ jQuery и triggerCustom доступны");
    // Пытаемся сообщить InSales, что мы готовы, сразу после загрузки
    // Это может быть преждевременным, но проверим реакцию
    $(document).ready(function() {
        console.log("Документ готов, пробуем отправить ready:insales:delivery");
        // $(document).triggerCustom('ready:insales:delivery'); // <-- Закомментировано
    });

    // Ждем события инициализации
    $(document).on('inited:insales:checkout:deliveries', function(e) {
        console.log('✅ InSales: Способы доставки инициализированы');
        console.log('Данные:', e.originalEvent.detail);

        // Сообщаем InSales, что мы готовы
        $(document).triggerCustom('ready:insales:delivery');
        console.log('📤 InSales: Сообщили, что готовы обрабатывать события');
    });

} else {
    console.error("❌ jQuery или triggerCustom недоступны");
}
