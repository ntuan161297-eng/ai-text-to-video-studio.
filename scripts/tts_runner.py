import sys
import argparse
import asyncio
import os
import re
import edge_tts

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def sanitize_for_tts(text: str) -> str:
    if not text:
        return "Nội dung video ngắn."
    s = text.replace("\u00a0", " ")
    # Remove URLs
    s = re.sub(r"https?://\S+", "", s)
    # Convert symbols to natural Vietnamese words
    s = s.replace("&", " và ")
    s = s.replace("+", " và ")
    s = s.replace("=", " bằng ")
    s = s.replace(">", " lớn hơn ")
    s = s.replace("<", " nhỏ hơn ")
    s = s.replace("~", " khoảng ")
    s = s.replace("|", ", ")
    s = s.replace("^", " ")
    # Convert brackets and parentheses to natural pauses
    s = re.sub(r"[\[\]{}()]", ", ", s)
    # Ellipses and multiple dots
    s = s.replace("…", ".")
    s = re.sub(r"\[\s*…\s*\]", "", s)
    s = re.sub(r"\[\s*\.\.\.\s*\]", "", s)
    s = re.sub(r"\.{2,}", ".", s)
    # Units & currencies
    s = s.replace("%", " phần trăm ")
    s = re.sub(r"°C", " độ C ", s, flags=re.IGNORECASE)
    s = re.sub(r"([0-9]+)\s*(?:đ|vnd|vnđ)", r"\1 đồng", s, flags=re.IGNORECASE)
    s = re.sub(r"([0-9]+)\s*-\s*([0-9]+)", r"\1 đến \2", s)
    # Remove markdown and formatting symbols
    s = re.sub(r"[*#`_]", "", s)
    # Remove emojis and non-speech symbols
    s = re.sub(r"[\U00010000-\U0010ffff]", "", s)
    s = re.sub(r"[\u2600-\u27ff]", "", s)
    # Collapse whitespace and punctuation
    s = re.sub(r"[\r\n\t]+", " ", s)
    s = re.sub(r"[,;]\s*[,;]+", ",", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^\s*[,;.]+\s*", "", s)
    s = re.sub(r"\s*,\s*$", ".", s)
    return s.strip() or "Nội dung video ngắn."

async def generate_with_edge_tts(text: str, voice: str, rate: str, output: str):
    clean_text = sanitize_for_tts(text)
    word_count = len(clean_text.split())

    # Tính toán timeout động dựa trên độ dài văn bản thực tế:
    # Tối thiểu 45 giây, cộng thêm 0.85s cho mỗi từ để bảo đảm không bao giờ timeout khi stream file âm thanh dài
    per_timeout = max(45.0, word_count * 0.85 + 25.0)

    # TUYỆT ĐỐI KHÔNG ĐỔI GIỌNG trong cùng một video (đảm bảo 100% video chỉ dùng 1 giọng đồng nhất)
    # Cả 3 lượt thử đều sử dụng chính xác giọng đọc người dùng đã chọn
    attempts = [
        {"voice": voice, "rate": rate, "timeout": per_timeout},
        {"voice": voice, "rate": "+0%", "timeout": per_timeout},
        {"voice": voice, "rate": rate, "timeout": per_timeout + 15.0},
    ]

    last_err = None
    for idx, conf in enumerate(attempts):
        try:
            if os.path.exists(output):
                try:
                    os.remove(output)
                except Exception:
                    pass
            cur_v = conf["voice"]
            cur_r = conf["rate"]
            cur_timeout = conf["timeout"]

            communicate = edge_tts.Communicate(clean_text, cur_v, rate=cur_r)
            await asyncio.wait_for(communicate.save(output), timeout=cur_timeout)

            if os.path.exists(output) and os.path.getsize(output) > 1000:
                print(f"SUCCESS:EDGE_TTS:{cur_v}")
                return True
            else:
                raise RuntimeError("Audio file empty or incomplete")
        except Exception as e:
            last_err = e
            print(f"EdgeTTS attempt {idx + 1}/{len(attempts)} for voice '{voice}' failed ({type(e).__name__}: {e}), retrying...", file=sys.stderr)
            if idx < len(attempts) - 1:
                await asyncio.sleep(2.0)

    if last_err:
        raise last_err
    return False

async def main():
    parser = argparse.ArgumentParser(description="Edge TTS Runner with strict voice consistency")
    parser.add_argument("--text-file", default=None, help="Path to UTF-8 text file")
    parser.add_argument("--text", default=None, help="Direct text content")
    parser.add_argument("--output", required=True, help="Path to output audio file")
    parser.add_argument("--voice", default="vi-VN-HoaiMyNeural", help="TTS Voice")
    parser.add_argument("--rate", default="+5%", help="Speech rate")

    args = parser.parse_args()

    text = ""
    if args.text_file and os.path.exists(args.text_file):
        with open(args.text_file, "r", encoding="utf-8") as f:
            text = f.read().strip()
    elif args.text:
        text = args.text.strip()
    elif not sys.stdin.isatty():
        try:
            text = sys.stdin.read().strip()
        except Exception:
            pass

    if not text:
        text = "Nội dung video ngắn."

    await generate_with_edge_tts(text, args.voice, args.rate, args.output)

if __name__ == "__main__":
    asyncio.run(main())
