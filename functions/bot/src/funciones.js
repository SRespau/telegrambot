function removeTextSigns(text) {
  let modifiedText = text.replace(/-/g, ' ')
  modifiedText = modifiedText.charAt(0).toUpperCase() + modifiedText.slice(1)
  return modifiedText
}

module.exports = { removeTextSigns }