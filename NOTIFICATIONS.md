# Joy Mouth-ийн шинэ захиалгын мэдэгдэл

Шинэ захиалга `orders/{orderId}`-д бүртгэгдэхэд `notifyNewOrder` ажиллана. Telegram, WhatsApp, вэб push тус тусдаа ажиллаж, түр зуурын алдааг дахин оролдоно. Мэдэгдэлд захиалгын лавлагаа, дүн орно. Telegram болон вэб push нь тухайн захиалгыг админ хуудсанд нээнэ. Утас, хаяг, хэрэглэгчийн нэрийг мэдэгдэлд дамжуулахгүй.

Админ хуудас нээлттэй үед шинэ захиалга дэлгэц дээр гарна. **Дуу асаах** дээр дарж тухайн табд дуут дохиог идэвхжүүлнэ. Хуудас хаалттай үед мэдэгдэл авах төхөөрөмж бүр дээр **Утас, компьютерийн мэдэгдэл асаах** дээр дарж, хөтчийн зөвшөөрөл өгнө.

## Firebase

1. Firebase төслийн Blaze төлөвлөгөө болон Firestore-ийн одоогийн Security Rules-ийг шалгана. `orders`-д захиалга үүсгэх эрхийг нэвтэрсэн, зөвшөөрөгдсөн хэрэглэгчээр хязгаарлана. `_adminPushDevices` болон `_orderNotificationDeliveries` цуглуулгад клиентээс унших, бичих эрх олгохгүй. Хэрэв бүх цуглуулгад хамаарах зөвшөөрөх дүрэм байвал түүнийг нарийвчлах шаардлагатай. Одоогийн дүрмийг энэ репогоос байрлуулахгүй.
2. Firebase Project settings → Cloud Messaging → Web Push certificates хэсэгт VAPID түлхүүр үүсгэнэ. Public key-ийг доорх `webPush.vapidKey` талбарт тавина. Үндсэн хөтөч дээрх админ нэвтрэлтэд ашигладаг Google и-мэйлийг `adminEmails` жагсаалтад яг тааруулна.
3. BotFather-аар Telegram bot үүсгэж, боттой хувийн чатаа нээгээд **Start** дарна. Тухайн чатны ID болон bot token-ыг серверийн secret-д тохируулна.
4. Meta WhatsApp Business Platform дээр илгээгчийн Phone Number ID, хүчинтэй access token, зөвшөөрсөн хүлээн авагч, батлагдсан message template бэлдэнэ. Template-ийн body нь **Joy Mouth-д шинэ захиалга бүртгэгдлээ. Захиалга #{{1}}. Нийт дүн {{2}}.** гэсэн дарааллаар хоёр positional text хувьсагчтай байна. Хүсвэл template-д `https://joy-mouth.vercel.app/admin.html` руу хөтлөх тогтмол URL товч нэмж болно. Template-ийн нэр, хэлний код, Graph API-ийн идэвхтэй хувилбарыг Meta дээрх тохиргоотой тааруулна.

`ORDER_NOTIFICATIONS` нь Firebase Secret Manager-д хадгалах JSON утга. Идэвхжүүлэх суваг бүрт тохирох хэсгийг бөглөнө. Тохируулаагүй сувгийн объектыг орхино.

```json
{
  "adminUrl": "https://joy-mouth.vercel.app/admin.html",
  "adminEmails": ["ADMIN_GOOGLE_EMAIL"],
  "telegram": {
    "botToken": "BOT_TOKEN",
    "chatId": "ADMIN_CHAT_ID"
  },
  "whatsapp": {
    "accessToken": "META_ACCESS_TOKEN",
    "phoneNumberId": "PHONE_NUMBER_ID",
    "recipient": "RECIPIENT_WITH_COUNTRY_CODE",
    "graphVersion": "ACTIVE_GRAPH_API_VERSION",
    "templateName": "APPROVED_TEMPLATE_NAME",
    "language": "APPROVED_TEMPLATE_LANGUAGE"
  },
  "webPush": {
    "vapidKey": "FCM_WEB_PUSH_PUBLIC_KEY"
  }
}
```

JSON-ийг репогоос гадна түр файлд хадгалаад Firebase CLI-ээр тохируулна. CLI-д нэвтэрч төслийг сонгоно. Cloud Functions-ийн одоогийн бүс `us-central1`. Firestore-ийн байршил, Firebase CLI-ийн deployment шалгалтаар шаардлагатай бол trigger-ийн бүсийг тааруулна.

```bash
firebase functions:secrets:set ORDER_NOTIFICATIONS --project joymouth-e0898 --data-file /path/outside/repo/order-notifications.json
firebase deploy --only functions:notifyNewOrder,functions:configureAdminPush --project joymouth-e0898
```

Vercel-д админ хуудасны өөрчлөлтийг нийтэлсний дараа нэг туршилтын захиалгаар дөрвөн сувгийг шалгана. Түр алдаатай хүргэлтийг 30 минутын дотор дахин оролдоно. Илгээсэн төлөвийг захиалга, суваг, төхөөрөмжөөр хадгалдаг. Үйлчилгээ мессежийг авсан ч сүлжээний хариу тасарвал ховор тохиолдолд давхар мэдэгдэл гарч болно. Хуучин бүртгэлийг автоматаар цэвэрлэхээр `_orderNotificationDeliveries` цуглуулгын `expiresAt` талбарт Firestore TTL тохируулж болно.
