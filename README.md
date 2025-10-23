import requests
import base64

# ====== STEP 1: ตั้งค่าพื้นฐาน ======
API_URL = "https://api.speechace.co/api/scoring/text/v9/json"
API_KEY = "YOUR_API_KEY"   # <-- ใส่คีย์จริงที่ได้จาก SpeechAce

# ====== STEP 2: คำเป้าหมาย ======
begin_b = ["beach", "book", "bad", "back", "bird", "bug", "blue", "ball", "bed", "bag"]
final_b = ["crab", "cab", "club", "grab", "tab", "scrub", "mob", "job", "gab", "lab"]
begin_v = ["van", "voice", "visit", "venus", "vein", "view", "virus", "vampire", "verse", "vitamin"]
final_v = ["love", "give", "five", "have", "cave", "dove", "live", "glove", "brave", "save"]

# รวมคำทั้งหมด
all_words = {
    "Beginning /b/": begin_b,
    "Final /b/": final_b,
    "Beginning /v/": begin_v,
    "Final /v/": final_v
}

# ====== STEP 3: ฟังก์ชันแปลงเสียงเป็น base64 ======
def encode_audio(file_path):
    with open(file_path, "rb") as f:
        audio_bytes = f.read()
        return base64.b64encode(audio_bytes).decode("utf-8")

# ====== STEP 4: ฟังก์ชันส่งไป SpeechAce ======
def check_pronunciation(word, audio_file):
    audio_b64 = encode_audio(audio_file)
    payload = {
        "user_id": "student01",
        "dialect": "en-us",
        "text": word,
        "audio_base64": audio_b64,
        "include_fluency": "1",
        "include_intonation": "1"
    }
    headers = {"key": API_KEY}
    response = requests.post(API_URL, json=payload, headers=headers)
    return response.json()

# ====== STEP 5: ตัวอย่างใช้งาน ======
# ตัวอย่าง: ตรวจคำ "beach" และ "love"
for word in ["beach", "love"]:
    print(f"\n--- Checking: {word} ---")
    result = check_pronunciation(word, f"{word}.wav")  # ต้องมีไฟล์เสียงชื่อเดียวกัน
    print("Overall Score:", result["overall_score"])

    for phone in result["words"][0]["phones"]:
        print(f"  {phone['phone']}: {phone['score']}")

# ====== STEP 6 (เพิ่มเติม): ทำลูปตรวจทุกคำในกลุ่ม ======
# for category, words in all_words.items():
#     print(f"\n=== {category} ===")
#     for w in words:
#         result = check_pronunciation(w, f"{w}.wav")
#         print(f"{w}: {result['overall_score']}")
