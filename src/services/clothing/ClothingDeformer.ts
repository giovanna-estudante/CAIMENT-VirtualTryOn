  /**
   * Aplica as influências às posições dos vértices e exporta uma malha
   * já deformada, para o AvatarViewer não precisar controlar shape keys.
   */
  private bakeMorphTargets(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;

      const mesh = child as MorphMesh;
      if (
        !mesh.geometry ||
        !mesh.morphTargetInfluences ||
        !mesh.morphTargetDictionary
      ) {
        return;
      }

      const geometry = mesh.geometry;
      const position = geometry.attributes.position;
      const morphAttributes = geometry.morphAttributes.position;

      if (!position || !morphAttributes?.length) return;

      const basePositions = position.array;
      const resultPositions = new Float32Array(basePositions.length);
      resultPositions.set(basePositions);

      const influences = mesh.morphTargetInfluences;
      const relative = geometry.morphTargetsRelative;

      morphAttributes.forEach((morphAttribute, morphIndex) => {
        const influence = influences[morphIndex] ?? 0;
        if (influence === 0) return;

        const morphArray = morphAttribute.array;

        for (let i = 0; i < resultPositions.length; i += 3) {
          if (relative) {
            resultPositions[i] += morphArray[i] * influence;
            resultPositions[i + 1] += morphArray[i + 1] * influence;
            resultPositions[i + 2] += morphArray[i + 2] * influence;
          } else {
            resultPositions[i] = THREE.MathUtils.lerp(
              basePositions[i],
              morphArray[i],
              influence,
            );
            resultPositions[i + 1] = THREE.MathUtils.lerp(
              basePositions[i + 1],
              morphArray[i + 1],
              influence,
            );
            resultPositions[i + 2] = THREE.MathUtils.lerp(
              basePositions[i + 2],
              morphArray[i + 2],
              influence,
            );
          }
        }
      });

      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(resultPositions, 3),
      );

      geometry.deleteAttribute('normal');
      geometry.computeVertexNormals();

      geometry.morphAttributes.position = [];
      mesh.morphTargetInfluences = [];
      mesh.morphTargetDictionary = {};
    });
  }

  private exportAsGlb(object: THREE.Object3D): Promise<string> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();

      exporter.parse(
        object,
        (result) => {
          if (!(result instanceof ArrayBuffer)) {
            reject(new Error('O GLTFExporter não retornou um GLB.'));
            return;
          }

          const blob = new Blob([result], {
            type: 'model/gltf-binary',
          });

          resolve(URL.createObjectURL(blob));
        },
        (error) => {
          console.error('❌ Erro ao exportar GLB:', error);
          reject(error);
        },
        { binary: true },
      );
    });
  }
}
