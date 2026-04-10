from pathlib import Path
import brotli

src = Path("Files/Yokohama.0.4202.7arIXeHq470JB1lq.citb")
dst = src.with_suffix(".cit")

data = src.read_bytes()

# Для этого файла нужно убрать последние 4 байта
out = brotli.decompress(data[:-4])

dst.write_bytes(out)
print(f"Готово: {dst}")
print(f"Размер .cit: {len(out)} байт")