pub fn pad_to_32_bytes(input: &[u8]) -> [u8; 32] {
    let mut padded = [0u8; 32];
    let len = input.len().min(32);
    padded[..len].copy_from_slice(&input[..len]);
    padded
}