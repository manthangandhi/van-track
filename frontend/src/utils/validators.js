// Form validators and utility functions

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone) {
  // Simple check for 10+ digit numbers
  const re = /^[\d\s\-\+\(\)]{10,}$/
  return re.test(phone)
}

export function validatePassword(password) {
  return password && password.length >= 6
}

export function validateRequired(value) {
  return value && value.toString().trim().length > 0
}

export function validateFileSize(file, maxSizeKB = 500) {
  return file.size / 1024 <= maxSizeKB
}

export function validateFileType(file, allowedTypes = ['image/jpeg', 'image/png']) {
  return allowedTypes.includes(file.type)
}

export function getErrorMessage(field, validation) {
  switch (validation) {
    case 'required':
      return `${field} is required`
    case 'email':
      return 'Invalid email address'
    case 'password':
      return 'Password must be at least 6 characters'
    case 'phone':
      return 'Invalid phone number'
    case 'fileSize':
      return 'File size exceeds limit'
    case 'fileType':
      return 'Invalid file type'
    default:
      return 'Invalid input'
  }
}
