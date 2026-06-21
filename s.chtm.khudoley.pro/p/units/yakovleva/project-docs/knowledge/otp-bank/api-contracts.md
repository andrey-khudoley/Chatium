---
title: 'ОТП Банк — SOAP API контракты (b2pos.ru)'
type: reference
tags:
  - topic/otp-bank
  - topic/payments
  - topic/api
  - topic/soap
created: 2026-05-08
project: olga-getcourse-payments-c7d5a1
---

# ОТП Банк — SOAP API (b2pos.ru)

**Документация краткая форма v2.4:** https://api.b2pos.ru/loan/manual/  
**Документация полная форма v2.7:** https://api.b2pos.ru/loan/manual/full/  
**Протокол:** SOAP/HTTPS  
**Endpoint:** https://api.b2pos.ru (точный URL WSDL — в документации банка)

---

## Аутентификация

Каждый SOAP-запрос включает:

| Параметр        | Описание                 | Где получить       |
| --------------- | ------------------------ | ------------------ |
| `userId`        | ID пользователя/магазина | Менеджер ОТП Банка |
| `userToken`     | Токен доступа            | Менеджер ОТП Банка |
| `pointOfSaleId` | ID торговой точки        | Менеджер ОТП Банка |

---

## PHP-клиенты

### vanta/b2pos-soap-client (рекомендуется, PHP 8.1+)

```bash
composer require vanta/b2pos-soap-client
```

**GitHub:** https://github.com/VantaFinance/b2pos-soap-client

```php
use Vanta\Integration\B2posSoapClient\SoapClientBuilder;

$psr18Client = new \Nyholm\Psr7\Factory\Psr17Factory(); // или любой PSR-18 клиент
$builder = SoapClientBuilder::create($psr18Client, 'yourUserId', 'yourUserToken');

$loanApplicationClient = $builder->createLoanApplicationClient();
$loanAgreementClient   = $builder->createLoanAgreementClient();
$loanProductClient     = $builder->createLoanProductClient();
$documentClient        = $builder->createDocumentClient();
```

### axelpal/poscredit (альтернатива)

```bash
composer require axelpal/poscredit
```

**GitHub:** https://github.com/AxelPAL/poscredit-php

```php
$loanService = new \LoanService();
```

---

## Методы LoanApplicationClient

### newLoanApplicationShort — создать заявку (краткая форма)

```php
public function newLoanApplicationShort(
    NewLoanApplicationRequestShort $request
): string; // numeric-string — ID созданной заявки (profileId)
```

**Параметры запроса (NewLoanApplicationRequestShort):**

| Параметр                  | Тип                     | Описание                                       | Обязательный |
| ------------------------- | ----------------------- | ---------------------------------------------- | ------------ |
| `requestId`               | string                  | Уникальный ID заявки в вашей системе           | ✅           |
| `pointOfSaleId`           | string                  | ID торговой точки                              | ✅           |
| `loanType`                | LoanTypeShort           | Тип кредита (enum: `LOAN`)                     | ✅           |
| `loanPeriodInMonths`      | int                     | Срок кредита в месяцах                         | ✅           |
| `firstname`               | string                  | Имя клиента                                    | ✅           |
| `lastname`                | string                  | Фамилия клиента                                | ✅           |
| `secondname`              | string                  | Отчество клиента                               | ✅           |
| `phoneNumber`             | PhoneNumber             | Телефон (`PhoneNumber::parse('+79611234567')`) | ✅           |
| `userInn`                 | string                  | ИНН клиента (12 цифр)                          | ✅           |
| `russianPassportDocument` | RussianPassportDocument | Серия + номер паспорта                         | ✅           |
| `firstPaymentAmount`      | MoneyPositiveOrZero     | Первоначальный взнос (**в копейках**)          | ✅           |
| `basketProducts`          | BasketProduct[]         | Товары в корзине                               | ✅           |
| `comment`                 | string                  | Комментарий к заявке                           | ❌           |

> ⚠️ **Суммы передаются в копейках!** 50 000 руб. → `5000000`

**Структура BasketProduct:**

| Поле  | Описание                                        |
| ----- | ----------------------------------------------- |
| name  | Название товара/услуги                          |
| price | Стоимость (MoneyPositiveOrZero, в **копейках**) |
| model | Модель товара                                   |
| brand | Бренд / производитель                           |

**Пример:**

```php
use Vanta\Integration\B2posSoapClient\Client\LoanApplication\Request\Short\NewLoanApplicationRequest as ShortRequest;
use Vanta\Integration\B2posSoapClient\ValueObject\MoneyPositiveOrZero;
use Vanta\Integration\B2posSoapClient\ValueObject\PhoneNumber;
use Vanta\Integration\B2posSoapClient\ValueObject\RussianPassportDocument;
use Vanta\Integration\B2posSoapClient\Enum\LoanTypeShort;

$request = new ShortRequest(
    requestId: 'getcourse-order-' . $orderId,
    pointOfSaleId: 'YOUR_POS_ID',
    loanType: LoanTypeShort::LOAN,
    loanPeriodInMonths: 12,
    firstname: 'Иван',
    lastname: 'Иванов',
    secondname: 'Иванович',
    phoneNumber: PhoneNumber::parse('+79611234567'),
    userInn: '123456789012',
    russianPassportDocument: new RussianPassportDocument(
        series: new RussianPassportSeries('4500'),
        number: new RussianPassportNumber('123456')
    ),
    firstPaymentAmount: new MoneyPositiveOrZero(0), // 0 копеек = без взноса
    basketProducts: [
        new BasketProduct(
            name: 'Онлайн-курс "Название курса"',
            price: new MoneyPositiveOrZero(5000000), // 50 000 руб. в копейках
            model: 'online-course',
            brand: 'ОнлайнШкола'
        )
    ],
    comment: 'Заказ из GetCourse #' . $orderId
);

$profileId = $loanApplicationClient->newLoanApplicationShort($request);
// $profileId — numeric-string, ID заявки в системе ОТП Банка
// Сохранить $profileId для последующей проверки статуса
```

---

### newLoanApplicationFull — создать заявку (полная форма)

```php
public function newLoanApplicationFull(
    NewLoanApplicationRequestFull $request
): string; // numeric-string — ID созданной заявки
```

Полная форма содержит больше персональных данных клиента. Структура аналогична краткой, но с дополнительными полями. **Детали — в документации v2.7:** https://api.b2pos.ru/loan/manual/full/

---

### getLoanApplicationStatus — статус заявки

```php
public function getLoanApplicationStatus(
    string $profileId // numeric-string, полученный при создании заявки
): GetLoanApplicationStatusResponse;
```

Возвращает объект `GetLoanApplicationStatusResponse` с текущим статусом. Используется для polling-проверки статуса — см. [webhooks](webhooks.md).

---

## Методы статусов (axelpal/poscredit)

```php
// Статус по краткой форме
$response = $loanService->statusShortOpty(
    new StatusShortOptyRequest($userId, $userToken, $profileId)
);

// Статус по полной форме
$response = $loanService->statusOpty(
    new StatusOptyRequest($userId, $userToken, $profileId)
);

// Статус конкретной заявки по orderId + profileId
$response = $loanService->statusSelectedOpty(
    new StatusSelectedOptyRequest($userId, $userToken, $orderId, $profileId)
);
```

---

## Структура клиентов SDK

```
src/
├── LoanApplicationClient.php  — заявки на кредит
├── LoanAgreementClient.php    — кредитные соглашения
├── LoanProductClient.php      — кредитные продукты (тарифы)
├── DocumentClient.php         — работа с документами
├── SoapClientBuilder.php      — фабрика клиентов
├── Client/
│   └── LoanApplication/
│       ├── Request/
│       │   ├── Short/NewLoanApplicationRequest.php
│       │   └── Full/NewLoanApplicationRequest.php
│       └── Response/
│           └── GetLoanApplicationStatusResponse.php
└── Infrastructure/            — транспортный слой
```

---

## Интеграция с CRM (пример для RetailCRM)

При настройке через HelixMedia (плагин RetailCRM + ОТП Банк):

1. Создать API-ключ в RetailCRM: **Настройки → Интеграция → Ключи доступа к API**
2. Дать права на группы методов: **Integration**, **Payments**, **Reference**
3. В настройках плагина ввести:
   - API-ключ RetailCRM
   - Адрес системы RetailCRM
   - Код организации (от менеджера ОТП Банка)
   - Код торговой точки (от менеджера ОТП Банка)

**Ссылка:** https://helixmedia.ru/blogs/manual/instruktsiya-po-integratsii-retailcrm-i-otp-bank-kreditovanie-pokupateley

---

## Структура ответа getLoanApplicationStatus

**Исходник:** [`GetLoanApplicationStatusResponse.php`](https://github.com/VantaFinance/b2pos-soap-client/blob/main/src/Client/LoanApplication/Response/GetLoanApplicationStatusResponse.php)

```php
final class GetLoanApplicationStatusResponse {
    // SOAP: [soapenv:Body][ns1:StatusOptyResponse][ns1:profileID]
    public readonly string $profileId;         // numeric-string

    // SOAP: [ns1:codeAgentMarket]
    public readonly ?string $employeeCodeInShop;  // nullable

    // SOAP: [ns1:results][ns1:result]
    public readonly array $resultFromBanks;    // array<int, ResultFromBank>
}
```

### ResultFromBank — результат от конкретного банка

**Исходник:** [`ResultFromBank.php`](https://github.com/VantaFinance/b2pos-soap-client/blob/main/src/Client/LoanApplication/Response/ResultFromBank.php)

| Поле                                  | Тип           | SOAP путь                         | Описание                           |
| ------------------------------------- | ------------- | --------------------------------- | ---------------------------------- |
| `$bankId`                             | string        | `[ns1:bank]`                      | ID банка                           |
| `$bankName`                           | string        | `[ns1:bankName]`                  | Название банка                     |
| `$bankCode`                           | string        | `[ns1:bankCode]`                  | Код банка                          |
| `$decision`                           | ?BankDecision | `[ns1:decision]`                  | **Решение банка (enum)**           |
| `$errorText`                          | ?string       | `[ns1:error_text]`                | Текст ошибки                       |
| `$chosenBankProductId`                | ?string       | `[ns1:selectedVariant]`           | ID выбранного продукта             |
| `$isLoanAgreementAuthorized`          | ?bool         | `[ns1:authStatus]`                | Авторизован ли кредитный договор   |
| `$loanAgreementNumber`                | ?string       | `[ns1:contractNumber]`            | Номер договора                     |
| `$authorizationCode`                  | ?string       | `[ns1:authCode]`                  | Код авторизации                    |
| `$isLoanApplicationCanceled`          | ?bool         | `[ns1:requestCancel]`             | Заявка отменена                    |
| `$isLoanAgreementAuthorizationCancel` | ?bool         | `[ns1:authCancel]`                | Авторизация договора отменена      |
| `$isIncreasedLimitApproved`           | ?bool         | `[ns1:increasedLimit]`            | Одобрен повышенный лимит           |
| `$offer`                              | ?Offer        | `[ns1:offer]`                     | Параметры предложения              |
| `$signType`                           | SignType      | `[ns1:signedType]`                | Тип подписи                        |
| `$isSesSigned`                        | bool          | `[ns1:signedTypeStatus]`          | Статус простой электронной подписи |
| `$sesAvailable`                       | ?bool         | `[ns1:isActiveSES]`               | Доступна ли ПЭП                    |
| `$insurances`                         | array         | `[ns1:insurances][ns1:insurance]` | Страховки                          |
| `$branchCode`                         | ?string       | `[ns1:branchCode]`                | Код отделения                      |

### BankDecision — enum значений решения банка

**Исходник:** [`BankDecision.php`](https://github.com/VantaFinance/b2pos-soap-client/blob/main/src/Client/LoanApplication/Struct/BankDecision.php)

```php
enum BankDecision: int {
    case IN_PROCESSING                         = -1;  // На рассмотрении
    case DENIED                                =  0;  // Отказ
    case APPROVED                              =  1;  // ✅ Одобрено
    case ERROR                                 =  2;  // Ошибка
    case REQUIRED_ADDITIONAL_FILLING_OUT       =  4;  // Нужны доп. данные
    case REQUIRED_CORRECTION_DATA_OR_DOCUMENTS =  5;  // Нужна корректировка данных
}
```

**Пример проверки статуса:**

```php
$statusResponse = $loanApplicationClient->getLoanApplicationStatus($profileId);

foreach ($statusResponse->resultFromBanks as $bankResult) {
    if ($bankResult->decision === BankDecision::APPROVED) {
        // Заявка одобрена этим банком
        updateGetCourseOrder($gcDealNumber, 'payed');
        break;
    }
}
```

---

## Открытые вопросы

- [ ] Точный URL WSDL для SOAP-эндпоинта (namespace `ns1` найден в SOAP ответе)
- [ ] Как из `profileId` формируется ссылка для редиректа покупателя
- [ ] Есть ли sandbox / тестовая среда
- [ ] Полная структура класса `Offer` (поля кредитного предложения)
- [ ] Таймаут незавершённых заявок
