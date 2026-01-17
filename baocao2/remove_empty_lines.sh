#!/bin/bash
# Script xóa các dòng trống trong file text
# Sử dụng: ./remove_empty_lines.sh <file>

if [ -z "$1" ]; then
    echo "Sử dụng: $0 <file.txt>"
    echo "Ví dụ: $0 chuong_1_tong_quan.txt"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "Lỗi: File '$1' không tồn tại"
    exit 1
fi

# Đếm số dòng trống trước khi xóa
empty_before=$(grep -c '^[[:space:]]*$' "$1")

# Xóa dòng trống và lưu vào file tạm
sed '/^[[:space:]]*$/d' "$1" > "$1.tmp"

# Thay thế file gốc
mv "$1.tmp" "$1"

# Đếm số dòng sau khi xóa
lines_after=$(wc -l < "$1")

echo "Đã xóa $empty_before dòng trống từ file '$1'"
echo "File hiện có $lines_after dòng"
