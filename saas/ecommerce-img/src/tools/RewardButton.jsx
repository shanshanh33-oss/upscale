import { useState } from 'react'
import { X } from 'lucide-react'

export default function RewardButton() {
  const [showTooltip, setShowTooltip] = useState(false)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-2">
        {showTooltip && (
          <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-3 py-2 text-xs text-gray-600 whitespace-nowrap animate-fade-in">
            感谢支持
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        )}
        <img src="/paw-icon.png" alt="打赏"
          onClick={() => setShowModal(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-12 h-12 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform bg-white p-1 border border-gray-100" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center relative"
            onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">感谢支持</h3>
            <p className="text-sm text-gray-500 mb-4">如果这个工具帮到了你，可以请我喝杯奶茶。</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <img src="/wechat-reward.png" alt="微信赞赏码" className="w-48 h-48 mx-auto rounded-lg" />
            </div>
            <p className="text-xs text-gray-400">微信扫码赞赏</p>
          </div>
        </div>
      )}
    </>
  )
}
