<template>
  <div class="twrap">
    <div class="tleft panel">tutorial content</div>
    <div class="tright">
      <div class="ttop">
        <div class="files panel">files</div>
        <div class="editor panel">code editor</div>
      </div>
      <div class="tbottom panel">terminal</div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.twrap {
  display: flex;
  padding: 1.5rem;
  gap: 1.5rem;
  height: calc(100vh - var(--vp-nav-height));
}

.tleft {
  width: 38.2%;
}

.tright {
  display: flex;
  width: 61.8%;
  flex-direction: column;
  gap: 1.5rem;
}

.ttop {
  display: flex;
  height: 61.8%;
  gap: 0.5rem
}

.files {
  width: 12rem;
}

.editor {
  flex: 1 1 auto;
}

.tbottom {
  height: 38.2%;
}

.panel {
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 0.125rem;
}
</style>